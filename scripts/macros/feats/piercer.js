import {constants} from '../../constants.js';
import {chris} from '../../helperFunctions.js';
import {translate} from '../../translations.js';
import {queue} from '../../utility/queue.js';
async function reroll({speaker, actor, token, character, item, args, scope, workflow}) {
    if (workflow.hitTargets.size === 0 || !workflow.damageRoll || !['mwak', 'rwak', 'msak', 'rsak'].includes(workflow.item.system.actionType)) return;
    let originItem = chris.getItem(workflow.actor, 'Piercer: Reroll Damage');
    if (!originItem) return;
    let doExtraDamage = chris.perTurnCheck(originItem, 'feat', 'piercer', false, workflow.token.id);
    if (!doExtraDamage) return;
    let queueSetup = await queue.setup(workflow.item.uuid, 'piercerReroll', 390);
    if (!queueSetup) return;
    let damageTypes = chris.getRollsDamageTypes(workflow.damageRolls);
    if (!damageTypes.has('piercing')) {
        queue.remove(workflow.item.uuid);
        return;
    }
    let autoPiercer = chris.getConfiguration(originItem, 'auto') ?? false;
    if (autoPiercer) autoPiercer = chris.getConfiguration(originItem, 'reroll') ?? false;
    let lowRoll = null;
    let lowRollDice = null;
    let resultI;
    let resultJ;
    for (let i = 0; workflow.damageRoll.terms.length > i; i++) {
        let term = workflow.damageRoll.terms[i];
        if (!term.faces) continue;
        for (let j = 0; term.results.length > j; j++) {
            if (term.results[j].result > lowRoll && lowRoll != null) continue;
            if (term.results[j].result === lowRoll && term.faces < lowRollDice) continue;
            lowRoll = term.results[j].result;
            lowRollDice = term.faces;
            resultI = i;
            resultJ = j;
        }
    }
    if (autoPiercer) {
        if (lowRoll > autoPiercer) {
            queue.remove(workflow.item.uuid);
            return;
        }
    } else {
        let selection = await chris.dialog(originItem.name, constants.yesNo, 'Reroll low roll of ' + lowRoll + '?');
        if (!selection) {
            queue.remove(workflow.item.uuid);
            return;
        }
    }
    if (chris.inCombat()) await originItem.setFlag('chris-premades', 'feat.piercer.turn', game.combat.round + '-' + game.combat.turn);
    let roll = await new Roll('1d' + lowRollDice).roll({'async': true});
    let newDamageRoll = workflow.damageRoll;
    newDamageRoll.terms[resultI].results[resultJ].result = roll.total;
    newDamageRoll._total = newDamageRoll._evaluateTotal();
    await workflow.setDamageRoll(newDamageRoll);
    await originItem.use();
    queue.remove(workflow.item.uuid);
}
async function combatEnd(origin) {
    await origin.setFlag('chris-premades', 'feat.piercer.turn', '');
}
async function critical({speaker, actor, token, character, item, args, scope, workflow}) {
    if (!workflow.isCritical || !workflow.damageRoll) return;
    let feature = chris.getItem(workflow.actor, 'Piercer: Critical Hit');
    if (!feature) return;
    let queueSetup = await queue.setup(workflow.item.uuid, 'piercerCritical', 250);
    if (!queueSetup) return;
    let damageTypes = chris.getRollsDamageTypes(workflow.damageRolls);
    if (!damageTypes.has('piercing')) {
        queue.remove(workflow.item.uuid);
        return;
    }
    let damageType = damageTypes.size > 1 ? await chris.dialog(feature.name, Array.from(damageTypes).map(i => [chris.titleCase(i), i]), 'What damage type should be used?') : damageTypes.first();
    if (!damageType) damageType = damageTypes.first();
    let damageRolls = workflow.damageRolls.filter(i => i.options.type === damageType);
    if (!damageRolls.length) {
        queue.remove(workflow.item.uuid);
        return;
    }
    let largeDice;
    for (let j of damageRolls) {
        for (let i of j.terms) {
            if (!i.faces) continue;
            if (largeDice > i.faces) continue;
            largeDice = i.faces;
        }
    }
    if (!largeDice) {
        queue.remove(workflow.item.uuid);
        return;
    }
    let bonusDamageFormula = '1d' + largeDice + '[' + damageType + ']';
    await chris.addToDamageRoll(workflow, bonusDamageFormula, true);
    await feature.use();
    queue.remove(workflow.item.uuid);
}
export let piercer = {
    'reroll': reroll,
    'combatEnd': combatEnd,
    'critical': critical
};