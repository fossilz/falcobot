/**
 * This is just an example script template
 * - Scripts make it easy to test out a bit of functionality
 */

import { config } from "../dist";

const main = async () => {
  return config;
};

main()
  .then((result: any) => console.log(result || "Done"))
  .catch((err) => console.log(err));
