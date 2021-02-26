export class TimeSpan {
    public days: number;
    public hours: number;
    public minutes: number;
    public seconds: number;
    public totalMilliseconds: number;

    constructor(days: string|undefined, hours: string|undefined, minutes: string|undefined, seconds: string|undefined) {
        const sVal = Number(seconds);
        let mVal: number = 0;
        let hVal: number = 0;
        if (!isNaN(sVal)){
            const modulus = sVal % 60;
            this.seconds = modulus;
            mVal = Math.floor(sVal / 60);
        } else {
            this.seconds = 0;
        }
        const mParse = Number(minutes);
        if (!isNaN(mParse)) {
            mVal += mParse;
        }
        this.minutes = mVal % 60;
        hVal = Math.floor(mVal / 60);
        const hParse = Number(hours);
        if (!isNaN(hParse)) {
            hVal += hParse;
        }
        this.hours = hVal % 24;
        this.days = Math.floor(hVal / 24);
        const dParse = Number(days);
        if (!isNaN(dParse)) {
            this.days += dParse;
        }
        this.totalMilliseconds = ((((((this.days * 24) + this.hours) * 60) + this.minutes) * 60) + this.seconds) * 1000;
    }

    toString = (): string => {
        let nonZeroFields = 0;
        if (this.days > 0) nonZeroFields++;
        if (this.hours > 0) nonZeroFields++;
        if (this.minutes > 0) nonZeroFields++;
        if (this.seconds > 0) nonZeroFields++;
        if (nonZeroFields > 1) {
            const dateArray = [];
            if (this.days > 0) dateArray.push(`${this.days}d`);
            if (this.hours > 0) dateArray.push(`${this.hours}h`);
            if (this.minutes > 0) dateArray.push(`${this.minutes}m`);
            if (this.seconds > 0) dateArray.push(`${this.seconds}s`);
            return dateArray.join(' ');
        } else {
            if (this.days > 0) return this.pluralize(this.days, 'day');
            if (this.hours > 0) return this.pluralize(this.hours, 'hour');
            if (this.minutes > 0) return this.pluralize(this.minutes, 'minute');
            if (this.seconds > 0) return this.pluralize(this.seconds, 'second');

            return 'Unknown';
        }
    }

    pluralize = (val: number, unit: string): string => {
        if(val === 1) {
            return '1 ' + unit;
        }
        return `${val} ${unit}s`;
    }

    leftPad = (val: number, resultLength: number, leftPadChar?: string) => {
        const lpc = leftPadChar || '0';
        return (String(lpc).repeat(resultLength) + String(val)).slice(String(val).length);
    }
}

export class TimeParser {
    public static ParseTimeArgument = (arg: string|null|undefined) : TimeSpan | null => {
        if (arg === null || arg === undefined) {
            return null;
        }
        const timePattern = /^(?:(\d+)d)?:?(?:(\d+)h)?:?(?:(\d+)m)?:?(?:(\d+)s)?$/;
        const timeMatch = timePattern.exec(arg);
        if (timeMatch === null) return null;
        return new TimeSpan(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
    }
}