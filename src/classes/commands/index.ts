import { Command } from './Command';
import InfoCommands from './info';
import ModCommands from './mod';

const commandArray:Command[] = (<Command[]>[]).concat(
        InfoCommands, 
        ModCommands
    );

export default commandArray;