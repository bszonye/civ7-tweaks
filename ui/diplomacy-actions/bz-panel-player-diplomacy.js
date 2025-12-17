class bzPlayerDiplomacyActionPanel {
    static c_prototype;
    locations = new Map();
    constructor(component) {
        this.component = component;
        component.bzComponent = this;
        this.patchPrototypes(this.component);
    }
    patchPrototypes(component) {
        const c_prototype = Object.getPrototypeOf(component);
        if (bzPlayerDiplomacyActionPanel.c_prototype == c_prototype) return;
        // patch component methods
        const proto = bzPlayerDiplomacyActionPanel.c_prototype = c_prototype;
        // afterCreateMinorPlayerListItem
        const afterCreateMinorPlayerListItem = this.afterCreateMinorPlayerListItem;
        const createMinorPlayerListItem = proto.createMinorPlayerListItem;
        proto.createMinorPlayerListItem = function(...args) {
            const item = createMinorPlayerListItem.apply(this, args);
            args = [item, ...args];
            return afterCreateMinorPlayerListItem.apply(this.bzComponent, args);
        }
    }
    beforeAttach() {
        this.locations.clear();
        for (const player of Players.getAlive()) {
            if (player.isIndependent) {
                const loc = player.Constructibles?.getConstructibles().find(cons => {
                    const info = GameInfo.Constructibles.lookup(cons.type);
                    return info?.ConstructibleType == "IMPROVEMENT_VILLAGE" ||
                        info?.ConstructibleType == "IMPROVEMENT_ENCAMPMENT";
                })?.location;
                this.locations.set(player.id, loc);
            } else {
                const cities = player.Cities?.getCities();
                const loc = cities?.at(0)?.location;
                this.locations.set(player.id, loc);
            }
        }
    }
    afterAttach() { }
    beforeDetach()  {}
    afterDetach() { }
    afterCreateMinorPlayerListItem(item, player) {
        // adjust vanilla styling
        const content = item.firstChild;
        content.firstChild.style.filter = "drop-shadow(0 0.22rem 0.11rem #0006)";
        content.children[1]?.classList.remove("mt-2");
        // show city-state type and befriending status
        const column = document.createElement("div");
        column.classList.value =
            "basis-full shrink flex flex-row flex-row-reverse justify-start items-center";
        const typeBG = document.createElement("div");
        typeBG.classList.value = "-ml-14 mr-2 size-14 bg-cover bg-no-repeat";
        typeBG.style.backgroundImage = `url('blp:buildicon_open')`;
        typeBG.style.filter = "saturate(0.25) drop-shadow(0 0.22rem 0.11rem black)";
        const typeIcon = document.createElement("div");
        typeIcon.classList.value = "size-14 bg-cover bg-no-repeat";
        const type = GameInfo.Independents
            .find(i => player.civilizationAdjective == i.CityStateName)
            ?.CityStateType.toLowerCase() ?? "crisis";
        const color =
            type == "militaristic" ? "#af1b1c" :
            type == "scientific" ? "#4d7c96" :
            type == "economic" ? "#ffd553" :
            type == "cultural" ? "#892bb3" :
            type == "diplomatic" ? "#255be4" :
            type == "expansionist" ? "#00a717" :
            type == "crisis" ? "#af1b1c" :
            "#af1b1c";
        typeIcon.style.backgroundImage = `url('blp:bonustype_${type}')`;
        typeIcon.style.opacity = 0.5;
        typeIcon.style.filter = `brightness(2) fxs-color-tint(${color})`;
        column.appendChild(typeBG);
        column.appendChild(typeIcon);
        // show city-state bonus in tooltip
        const bonusType = Game.CityStates.getBonusType(player.id);
        const bonus = GameInfo.CityStateBonuses.lookup(bonusType);
        if (bonus) {
            const name = Locale.compose(bonus.Name);
            const desc = Locale.compose(bonus.Description);
            // style the tooltip text to fix fonticon alignment
            const tooltip = `[b]${name}[/b][n]${desc}`
                .split(/\[[Nn]\]/)
                .map(s => `[style:leading-normal]${s}[/style]`)
                .join("[n]");
            console.warn(`TRIX TT ${JSON.stringify(tooltip)}`);
            typeIcon.setAttribute("data-tooltip-content", tooltip);
        }
        // befriending status
        const observer = Players.get(GameContext.localObserverID);
        const diplomacy = observer.Diplomacy;
        const befriendType = DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN;
        const actions = Game.Diplomacy.getPlayerEvents(player.id)
            .filter(act => act.actionType == befriendType);
        const befriending = [];
        for (const act of actions) {
            const target = Players.get(act.targetPlayer);
            if (target.Influence?.hasSuzerain) continue;
            const player = Configuration.getPlayer(act.initialPlayer);
            const cdata = Game.Diplomacy.getCompletionData(act.uniqueID);
            const turns = cdata.turnsToCompletion;
            const order = player.id <= observer ? player.id + 1000 : player.id;
            befriending.push({ target, player, turns, order });
        }
        befriending.sort((a, b) => a.turns - b.turns || a.order - b.order);
        for (const friend of befriending) {
            const friendIcon = document.createElement("leader-icon");
            friendIcon.classList.value = "relative mr-2 size-13";
            if (diplomacy.hasMet(friend.player.id) || friend.player.id == observer.id) {
                friendIcon.setAttribute("leader", friend.player.leaderTypeName);
                friendIcon.setAttribute(
                    "bg-color",
                    UI.Player.getPrimaryColorValueAsString(friend.player.id)
                );
            } else {
                friendIcon.setAttribute("leader", "LEADER_UNMET");
            }
            const friendTurns = document.createElement("div");
            friendTurns.classList.value =
                "absolute -bottom-2 font-body-xs leading-tight bg-accent-2 px-1 z-1";
            friendTurns.style.paddingLeft = friendTurns.style.paddingRight = "0.125em";
            friendTurns.style.backgroundColor = "#000c";
            friendTurns.style.borderRadius = "0.375em";
            friendTurns.textContent = friend.turns.toString();
            friendIcon.appendChild(friendTurns);
            column.appendChild(friendIcon);
        }
        content.appendChild(column);
        item.addEventListener("action-activate", () => {
            // pan to civ location
            const loc = this.locations.get(player.id);
            if (!loc) return;
            const revealed = GameplayMap.getRevealedState(observer.id, loc.x, loc.y);
            if (revealed == RevealedStates.HIDDEN) return;
            Camera.lookAtPlot(loc);
        });
        return item;
    }
}
Controls.decorate("panel-player-diplomacy-actions", (c) => new bzPlayerDiplomacyActionPanel(c));
