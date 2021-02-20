/**
 * Try out logging into Discord
 */
import { Discord } from "../dist";

const main = async () => {
  const dc = new Discord().getInstance();
  const token = await dc.login();
  dc.close();
  return token;
};

main()
  .then((result: any) => console.log(result || "Done"))
  .catch((err) => console.log(err));
