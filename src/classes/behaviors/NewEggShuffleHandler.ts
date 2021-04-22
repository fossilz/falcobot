import https from 'https';
import moment from "moment";
import "moment-timezone";
import { v4 as uuidv4 } from 'uuid';
import ShuffleHistoryModel from '../dataModels/ShuffleHistoryModel';
import RepositoryFactory from '../RepositoryFactory';
import Discord from '../Discord';
import { Guild, NewsChannel, Role, TextChannel } from 'discord.js';
import { RolePingHandler } from './RolePingHandler';
import Repository from '../Repository';

export class NewEggShuffleLottery {
    public lotteryId: string;
    public lotteryStartDate: Date;
    public lotteryEndDate: Date;
    public lotteryDrawDate: Date;
    public sellingStartDate: Date;
    public sellingEndDate: Date;
    public drawInterval: string;
    public lotteryItems: LotteryItem[];
}

export class LotteryItem {
    public ChildItem: ChildItem[];
    public ParentItem: string;
    public Tag: string;
}

export class ChildItem {
    public ItemNumber: string;
    public ItemType: string;
    public PromotionCode: string;
    public IsPercentage: string;
    public Discount: string;
}

export class NewEggShuffleHandler {

    public static setupShuffleListener = () => {
        setInterval(async () => {
            const nes = await NewEggShuffleHandler.getNeweggShuffleAsync();
            await NewEggShuffleHandler.handleShuffleLotteryAsync(nes);
        }, 120000); // Two minutes
    }

    public static handleShuffleLotteryAsync = async (lottery: NewEggShuffleLottery|undefined) => {
        if (lottery === undefined) return;
        const repo = await RepositoryFactory.getInstanceAsync();
        const existingLottery = await repo.Shuffles.selectLottery(lottery.lotteryId);
        if (existingLottery !== undefined){
            // Potentially check for item changes later
            return;
        }
        const historyModel = NewEggShuffleHandler.getShuffleHistoryModel(lottery);
        await repo.Shuffles.insertHistory(historyModel);
        const client = Discord.getInstance();
        client.emit('neweggShuffle', historyModel); // emit the event that a Newegg Shuffle has been added
    }

    public static handleShuffleForGuildAsync = async (guild: Guild, historyModel: ShuffleHistoryModel|undefined) : Promise<void> => {
        if (historyModel === undefined) return;
        const repo = await RepositoryFactory.getInstanceAsync();
        const settings = await repo.Shuffles.selectSettings(guild.id);
        if (settings === undefined) return; // Not setup for Shuffle handling
        if (!settings.enabled) return;
        const now = moment().utc();
        const lStart = moment.utc(historyModel.lotteryStartDate);
        const lEnd = moment.utc(historyModel.lotteryEndDate);
        if (now > lEnd) return; // No need to announce if this shuffle has already ended
        const warningSeconds = settings.warning_seconds || 300;
        const announceChannel = guild.channels.cache.get(settings.announce_channel_id);
        if (announceChannel === undefined || !(announceChannel instanceof TextChannel || announceChannel instanceof NewsChannel) ) {
            // emit error somehow?
            return;
        }
        const pingRole = settings.ping_role_id === null ? undefined : guild.roles.cache.get(settings.ping_role_id);
        const nowPlusWarn = moment(now).add(warningSeconds, 'seconds');

        // Check for message eligibility
        if (nowPlusWarn < lStart) { // If we're more than (warning seconds) before the start
            await NewEggShuffleHandler.announceShuffleStatusAsync(announceChannel, pingRole, historyModel.lotteryId, settings.prepare_message, settings.randomize_url);
        }
        if (nowPlusWarn < lEnd) { // If we're not already in the warn period
            const seconds_before_start = lStart.diff(now, 'seconds');
            if (seconds_before_start <= 0) {
                await NewEggShuffleHandler.announceShuffleStatusAsync(announceChannel, pingRole, historyModel.lotteryId, settings.start_message, settings.randomize_url);
            } else {
                setTimeout(
                    async () => await NewEggShuffleHandler.announceShuffleStatusAsync(announceChannel, pingRole, historyModel.lotteryId, settings.start_message, settings.randomize_url)
                , seconds_before_start * 1000);
            }
        }
        if ((settings.warning_seconds || 0) > 0 && now < lEnd) {
            const warnBeforeEndThreshold = moment(lEnd).add(0 - warningSeconds, 'seconds');
            const seconds_until_warn = warnBeforeEndThreshold.diff(now, 'seconds');
            if (seconds_until_warn <= 0) {
                await NewEggShuffleHandler.announceShuffleStatusAsync(announceChannel, pingRole, historyModel.lotteryId, settings.warn_message, settings.randomize_url);
            } else {
                setTimeout(
                    async () => await NewEggShuffleHandler.announceShuffleStatusAsync(announceChannel, pingRole, historyModel.lotteryId, settings.warn_message, settings.randomize_url)
                , seconds_until_warn * 1000);
            }
        }
    }

    private static announceShuffleStatusAsync = async (channel: TextChannel|NewsChannel, pingRole: Role|undefined, lotteryId: string, statusMessage: string, randomize_url: boolean) => {
        const repo = await RepositoryFactory.getInstanceAsync();
        const historyModel = await repo.Shuffles.selectLottery(lotteryId);
        if (historyModel === undefined) return;
        const lotteryItemMessage = NewEggShuffleHandler.getLotteryDescription(historyModel);
        if (lotteryItemMessage === undefined) {
            return;
        }
        const shuffle_url = NewEggShuffleHandler.formatShuffleUrl(lotteryId, randomize_url);
        const message = (pingRole === undefined ? "" : `<@&${pingRole.id}> `) + statusMessage + "\n" + lotteryItemMessage + "\n\n" + shuffle_url;
        const sendFunc = () => channel.send(message);
        await RolePingHandler.AllowRolePingAsync(pingRole, sendFunc);
    }

    public static getShuffleUrl = async (repo: Repository, guild_id: string, lotteryId: string) : Promise<string> => {
        const settings = await repo.Shuffles.selectSettings(guild_id);
        const randomize = settings?.randomize_url || true;
        return NewEggShuffleHandler.formatShuffleUrl(lotteryId, randomize);
    }

    public static formatShuffleUrl = (lotteryId: string, randomize_url: boolean) : string => {
        const url_tag = randomize_url ? uuidv4() : lotteryId;
        return 'https://www.newegg.com/product-shuffle?r=' + url_tag;
    }

    public static getLotteryDescription = (historyModel: ShuffleHistoryModel|undefined) : string|undefined => {
        if (historyModel === undefined) return;
        const lotteryItems: LotteryItem[] = JSON.parse(historyModel.lotteryItems);
        if (lotteryItems.length == 0) return;
        return NewEggShuffleHandler.formatLotteryItems(lotteryItems);
    }

    private static formatLotteryItems = (lotteryItems: LotteryItem[]) : string => {
        const lotteryItemDict: {[tag: string]: number} = {};
        lotteryItems.forEach(li => {
            if (lotteryItemDict[li.Tag] === undefined) {
                lotteryItemDict[li.Tag] = 0;
            }
            lotteryItemDict[li.Tag]++;
        });
        const itemsArray: string[] = [];
        Object.entries(lotteryItemDict).forEach(
            ([key, value]) => {
                if (value === 0) return;
                if (value === 1) {
                    itemsArray.push(`one ${key}`);
                    return;
                }
                itemsArray.push(`${value}x ${key}`);
            }
        );
        return itemsArray.join(', ');
    }

    public static getNeweggShuffleAsync = async () : Promise<NewEggShuffleLottery|undefined> => {
        const apiRequest = new NewEggShuffleApiRequest();
        const jsonApiString = await (new Promise<string>(apiRequest.getLottery()));
        try {
            const lotteryResults: any[] = JSON.parse(JSON.parse(jsonApiString));
            const firstResult = lotteryResults[0];
            const result = new NewEggShuffleLottery();
            result.lotteryId = firstResult.LotteryID;
            result.lotteryStartDate = NewEggShuffleHandler.readPacificDateString(firstResult.LotteryStartDate);
            result.lotteryEndDate = NewEggShuffleHandler.readPacificDateString(firstResult.LotteryEndDate);
            result.lotteryDrawDate = NewEggShuffleHandler.readPacificDateString(firstResult.LotteryDrawDate);
            result.sellingStartDate = NewEggShuffleHandler.readPacificDateString(firstResult.SellingStartDate);
            result.sellingEndDate = NewEggShuffleHandler.readPacificDateString(firstResult.SellingEndDate);
            result.drawInterval = firstResult.DrawInterval;
            result.lotteryItems = firstResult.LotteryItems;
            return result;
        } catch (err) {
            console.log(err);
            return undefined;
        }
    }

    private static getShuffleHistoryModel = (lottery: NewEggShuffleLottery) : ShuffleHistoryModel => {
        const historyModel = new ShuffleHistoryModel();
        historyModel.lotteryId = lottery.lotteryId;
        historyModel.lotteryStartDate = moment(lottery.lotteryStartDate).toISOString();
        historyModel.lotteryEndDate = moment(lottery.lotteryEndDate).toISOString();
        historyModel.lotteryDrawDate = moment(lottery.lotteryDrawDate).toISOString();
        historyModel.sellingStartDate = moment(lottery.sellingStartDate).toISOString();
        historyModel.sellingEndDate = moment(lottery.sellingEndDate).toISOString();
        historyModel.drawInterval = lottery.drawInterval;
        historyModel.lotteryItems = JSON.stringify(lottery.lotteryItems);
        return historyModel;
    }

    private static readPacificDateString = (dtString: string) : Date => {
        const mmt = moment.tz(dtString, "America/Los_Angeles");
        return mmt.toDate();
    }
}

class NewEggShuffleApiRequest {
    private apiData: string = "";

    public getLottery = (): (resolve: (value: string) => void, reject: (reason?: any) => void) => void => {
        const _self = this;
        return (resolve: (value: string) => void, reject: (reason?: any) => void) => {
            https.get('https://www.newegg.com/api/common/Lottery', (resp) => {
                resp.on('data', (chunk) => {
                    _self.apiData += chunk;
                });
                resp.on('end', () => {
                    resolve(_self.apiData);
                });
            }).on("error", (err) => {
                reject("Error: " + err.message);
            });
        };
    }
}