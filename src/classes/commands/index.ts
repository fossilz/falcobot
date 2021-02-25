import { Command } from './Command';
import AdminCommands from './admin';
import InfoCommands from './info';
import ModCommands from './mod';

const commandArray:Command[] = (<Command[]>[]).concat(
        AdminCommands,
        InfoCommands, 
        ModCommands
    );

export default commandArray;