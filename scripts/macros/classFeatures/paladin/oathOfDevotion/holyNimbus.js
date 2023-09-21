import {chris} from '../../../../helperFunctions.js';
import {constants} from '../../../../constants.js';
async function save(saveId, options) {
    if (options.advantage) return;
    let selection = await chris.dialog('Holy Nimbus', [['Yes', true], ['No', false]], 'Is this a save from a spell cast by a fiend or undead?');
    if (!selection) return;
    options.advantage = true;
}
async function turn(token) {
    let targetToken = game.canvas.tokens.get(game.combat.current.tokenId);
    if (!targetToken) return;
    if (targetToken.document.disposition === token.document.disposition) return;
    let distance = chris.getDistance(token, targetToken);
    if (distance > 30) return;
    let featureData = await chris.getItemFromCompendium('chris-premades.CPR Class Feature Items', 'Holy Nimbus - Damage', false);
    if (!featureData) return;
    featureData.system.description.value = chris.getItemDescription('CPR - Descriptions', 'Sacred Weapon - Dismiss');
    delete featureData._id;
    let feature = new CONFIG.Item.documentClass(featureData, {'parent': token.actor});let [config, options] = constants.syntheticItemWorkflowOptions([targetToken.document.uuid]);
    await warpgate.wait(100);
    await MidiQOL.completeItemUse(feature, config, options);
}
export let holyNimbus = {
    'save': save,
    'turn': turn
}