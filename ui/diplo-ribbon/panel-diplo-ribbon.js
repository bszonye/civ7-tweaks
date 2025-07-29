/**
 * @file panel-diplo-ribbon.ts
 * @copyright 2021-2025, Firaxis Games
 * @description Houses the players' portraits and stats and start of diplomatic interactions
 */
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import { ActionActivateEvent, ActionActivateEventName } from '/core/ui/components/fxs-activatable.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { InputEngineEventName, NavigateInputEventName } from '/core/ui/input/input-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
import { multiplayerTeamColors } from '/core/ui/utilities/utilities-network-constants.js';
import DiplomacyManager from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import { RaiseDiplomacyEvent } from '/base-standard/ui/diplomacy/diplomacy-events.js';
import DiploRibbonData, { RibbonStatsToggleStatus, UpdateDiploRibbonEvent } from '/base-standard/ui/diplo-ribbon/model-diplo-ribbon.js';
import FocusManager from '/core/ui/input/focus-manager.js';
/*
    The nav-help system assumes in order to hide unecessary icons that a new context is being pushed.
    We don't work quite that way, so it's necessary to push a do-nothing minimal panel.
*/
class DiploFakeContext extends Panel {
}
Controls.define('panel-diplo-ribbon-fake', {
    createInstance: DiploFakeContext,
    description: 'Placeholder for edit mode of diplo ribbon.'
});
export class PanelDiploRibbon extends Panel {
    constructor(root) {
        super(root);
        this.numLeadersToShow = 5;
        this.panArrows = false; // Necessary to use arrows to pan shown leader ribbons?
        this.activeDeviceTypeListener = this.onActiveDeviceTypeChanged.bind(this);
        this.interfaceModeChangedListener = this.onInterfaceModeChanged.bind(this);
        this.inputContextChangedListener = this.onInputContextChanged.bind(this);
        this.userOptionChangedListener = this.onUserOptionChanged.bind(this);
        this.attributePointsUpdatedListener = this.onAttributePointsUpdated.bind(this);
        this.engineInputListener = this.onEngineInput.bind(this);
        this.navigateInputListener = this.onNavigateInput.bind(this);
        this.yieldsItemListener = this.onShowPlayerYieldReport.bind(this);
        this.leadersLeftListener = this.scrollLeadersLeft.bind(this);
        this.leadersRightListener = this.scrollLeadersRight.bind(this);
        this.windowResizeListener = this.onWindowResize.bind(this);
        this.refreshDataListener = this.onModelUpdate.bind(this);
        this.bannerUpdateListener = this.onUpdateBanners.bind(this);
        this.civFlagEngineInputListener = this.onCivFlagEngineInput.bind(this);
        this.engineCaptureAllInputListener = this.onEngineCaptureAllInput.bind(this);
        this.mainContainer = document.createElement("fxs-hslot");
        this.toggleNavHelp = document.createElement("fxs-nav-help");
        this.navHelpLeft = document.createElement("fxs-nav-help");
        this.navHelpRight = document.createElement("fxs-nav-help");
        this.isHoverAll = false;
        this.topContainer = null;
        this.civFlagFlexboxPartOne = null;
        this.diploContainer = null;
        this.attributeButton = null;
        this.diploRibbons = [];
        this.firstLeaderIndex = 0;
        if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG") || InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB") || InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS")) {
            this.animateInType = this.animateOutType = AnchorType.RelativeToTop;
        }
        else {
            this.animateInType = this.animateOutType = AnchorType.RelativeToTopRight;
        }
    }
    onInitialize() {
        this.topContainer = document.createElement("fxs-vslot");
        this.topContainer.classList.value = 'justify-end';
        this.diploContainer = document.createElement('div');
        this.diploContainer.classList.add('diplo-ribbon__ribbon-container');
        this.mainContainer.classList.add("diplo-ribbon-nav-target");
        this.diploContainer.appendChild(this.mainContainer);
        this.topContainer.appendChild(this.diploContainer);
        this.Root.appendChild(this.topContainer);
        this.toggleNavHelpContainer = document.createElement("div");
        this.toggleNavHelpContainer.classList.add("absolute", "top-0", "left-0", "ml-1", "diplo-ribbon-toggle__nav-help");
        this.Root.appendChild(this.toggleNavHelpContainer);
        this.firstLeaderIndex = UI.getDiploRibbonIndex();
    }
    onAttach() {
        super.onAttach();
        //TODO: Need a better way to doing this, becomes more and more fragile/hard to read as more things are added that could effect this
        if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_PEACE_DEAL") || InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_PROJECT_REACTION")) {
            return;
        }
        else if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG") || InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS")) {
            this.Root.classList.add("diplomacy-dialog-ribbon");
        }
        else if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB")) {
            if (Players.get(DiplomacyManager.selectedPlayerID)?.isIndependent) {
                return;
            }
            else {
                if (DiplomacyManager.selectedPlayerID == GameContext.localPlayerID) {
                    this.Root.classList.add("local-player-diplomacy-hub-ribbon");
                }
                else {
                    this.Root.classList.add("other-player-diplomacy-hub-ribbon");
                }
            }
        }
        window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
        window.addEventListener("engine-input", this.engineCaptureAllInputListener, true);
        window.addEventListener('interface-mode-changed', this.interfaceModeChangedListener);
        window.addEventListener("resize", this.windowResizeListener);
        window.addEventListener('update-diplo-ribbon', this.bannerUpdateListener);
        engine.on('AttributePointsChanged', this.attributePointsUpdatedListener);
        engine.on('AttributeNodeCompleted', this.attributePointsUpdatedListener);
        engine.on('InputContextChanged', this.inputContextChangedListener);
        engine.on('UI_OptionsChanged', this.userOptionChangedListener);
        waitForLayout(() => {
            if (this.Root.isConnected) {
                this.populateFlags();
                DiploRibbonData.eventNotificationRefresh.on(this.refreshDataListener);
                this.realizeNavHelp();
            }
        });
    }
    onDetach() {
        UI.setDiploRibbonIndex(this.firstLeaderIndex);
        window.removeEventListener('update-diplo-ribbon', this.bannerUpdateListener);
        window.removeEventListener("resize", this.windowResizeListener);
        window.removeEventListener('interface-mode-changed', this.interfaceModeChangedListener);
        window.removeEventListener("engine-input", this.engineCaptureAllInputListener, true);
        window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
        engine.off('UI_OptionsChanged', this.userOptionChangedListener);
        engine.off('AttributePointsChanged', this.attributePointsUpdatedListener);
        engine.off('AttributeNodeCompleted', this.attributePointsUpdatedListener);
        engine.off('InputContextChanged', this.inputContextChangedListener);
        DiploRibbonData.eventNotificationRefresh.off(this.refreshDataListener);
        super.onDetach();
    }
    /**
     * Is the diplomacy ribbon in a state where it can take focus from a gamepad?
     * @returns
     */
    canTakeGamepadFocus() {
        let isFocusable = ActionHandler.isGamepadActive;
        if (isFocusable) {
            const alwaysShow = DiploRibbonData.areRibbonYieldsStuckOnScreen;
            if (alwaysShow && !this.panArrows) {
                isFocusable = false;
            }
        }
        return isFocusable;
    }
    realizeNavHelp() {
        const isShowing = this.canTakeGamepadFocus();
        if (isShowing) {
            this.toggleNavHelpContainer.classList.remove("hidden");
        }
        else {
            this.toggleNavHelpContainer.classList.add("hidden");
        }
    }
    onActiveDeviceTypeChanged(event) {
        if ([InputDeviceType.Controller, InputDeviceType.Hybrid].includes(event.detail.deviceType)) {
            this.realizeNavHelp();
        }
    }
    onWindowResize() {
        // window.innerWidth/innerHeight aren't the new values for 2 frames after the resize fires
        waitForLayout(() => { this.populateFlags(); });
    }
    populateFlags() {
        const isMobileViewExperience = UI.getViewExperience() == UIViewExperience.Mobile;
        if (InterfaceMode.getCurrent() == "INTERFACEMODE_DIPLOMACY_PROJECT_REACTION" || InterfaceMode.getCurrent() == "INTERFACEMODE_DIPLOMACY_DIALOG" || InterfaceMode.getCurrent() == "INTERFACEMODE_CALL_TO_ARMS") {
            this.Root.classList.remove("right-24");
        }
        else {
            this.Root.classList.add("right-24");
        }
        if (!this.mainContainer) {
            console.error("panel-diplo-ribbon: Unable to find mainContainer to attach flags to!");
            return;
        }
        while (this.mainContainer.hasChildNodes()) {
            this.mainContainer.removeChild(this.mainContainer.lastChild);
        }
        while (this.toggleNavHelpContainer.hasChildNodes()) {
            this.toggleNavHelpContainer.removeChild(this.toggleNavHelpContainer.firstChild);
        }
        const isDiplomacyHub = InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB");
        this.numLeadersToShow = isDiplomacyHub ? 6 : BZ_MAX_LEADERS;
        if (window.innerWidth >= Layout.pixelsToScreenPixels(1919) && !isMobileViewExperience) {
            this.numLeadersToShow = isDiplomacyHub ? 6 : BZ_MAX_LEADERS;
        }
        else if (window.innerWidth >= Layout.pixelsToScreenPixels(1599) && !isMobileViewExperience) {
            this.numLeadersToShow = isDiplomacyHub ? 5 : 6;
        }
        else {
            this.numLeadersToShow = isDiplomacyHub ? 3 : 5;
        }
        this.navHelpLeft.classList.add("h-14");
        if (!isDiplomacyHub) {
            this.navHelpLeft.setAttribute("action-key", "inline-nav-previous");
            this.navHelpLeft.classList.add("opacity-0");
            this.toggleNavHelp.classList.add("w-8", "relative", "top-3", "-left-6");
            this.toggleNavHelp.setAttribute("action-key", "inline-toggle-diplo");
            this.toggleNavHelp.setAttribute("decoration-mode", "border");
            this.toggleNavHelpContainer.appendChild(this.toggleNavHelp);
        }
        else {
            this.navHelpLeft.setAttribute("action-key", "inline-nav-shell-previous");
        }
        this.mainContainer.appendChild(this.navHelpLeft);
        // Check which array of player data we want to use
        let targetArray = null;
        if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG") ||
            InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS") ||
            InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_PROJECT_REACTION")) {
            targetArray = DiploRibbonData.diploStatementPlayerData;
        }
        else {
            targetArray = DiploRibbonData.playerData;
        }
        const numShown = Math.min(targetArray.length, this.numLeadersToShow);
        this.diploRibbons = [];
        // make room for high player counts
        if (11 <= numShown) this.Root.classList.remove("right-24");
        this.Root.classList.toggle("right-4", 11 <= numShown);
        this.Root.classList.toggle("top-8", numShown < 13);
        this.Root.classList.toggle("top-40", 13 <= numShown);
        // backdrop for screenshots
        if (BZ_BACKDROP) this.Root.classList.add('bg-primary-4', 'h-52');
        // in diplomacy hub, start off showing whichever leader we selected to get in here
        if (isDiplomacyHub) {
            for (let index = 0; index < targetArray.length; index++) {
                if (targetArray[index].id == DiplomacyManager.selectedPlayerID) {
                    const selectedIndex = index;
                    if (targetArray.length >= this.numLeadersToShow) {
                        if (selectedIndex < (this.numLeadersToShow - 1)) {
                            this.firstLeaderIndex = 0;
                        }
                        else {
                            this.firstLeaderIndex = selectedIndex - (this.numLeadersToShow - 1);
                        }
                    }
                    break;
                }
            }
        }
        // Evaluate if screen width is less than 1920 for adjustments.
        const isSmall = numShown >= 7 && window.innerWidth < Layout.pixelsToScreenPixels(1919);
        if (this.diploContainer) {
            this.diploContainer.classList.toggle("diplo-ribbon__ribbon-container-small", isSmall);
            this.diploContainer.classList.toggle("diplo-ribbon__ribbon-container-hub", isDiplomacyHub);
        }
        let scrollIndex = 0;
        this.panArrows = false;
        // if we have enough leaders visible to scroll, set up the left arrow
        if (targetArray.length > this.numLeadersToShow) {
            this.panArrows = true;
            const leftArrowBG = document.createElement("div");
            leftArrowBG.classList.add("diplo-ribbon__arrow-bg", "w-12", "h-14", "relative", "align-center", "self-start", "mt-4");
            const leftArrow = document.createElement("fxs-activatable");
            leftArrow.classList.add("diplo-ribbon-left-arrow", "absolute", "inset-0", "align-center", "bg-no-repeat", "bg-cover", "w-12", "h-14", "self-start");
            if (this.firstLeaderIndex > 0) {
                leftArrow.classList.add('img-arrow');
            }
            else {
                leftArrow.classList.add('img-arrow-disabled');
                leftArrow.setAttribute("disabled", "true");
            }
            leftArrow.addEventListener(ActionActivateEventName, this.leadersLeftListener);
            leftArrowBG.appendChild(leftArrow);
            this.mainContainer.appendChild(leftArrowBG);
            scrollIndex = this.firstLeaderIndex;
        }
        // The "up arrow" icon.
        this.toggleNavHelpContainer.classList.toggle("left-44", isSmall);
        if (this.panArrows) {
            this.toggleNavHelpContainer.classList.toggle("left-16", !isSmall);
        }
        else {
            // No arrows are showing
            this.toggleNavHelpContainer.classList.toggle("left-4", !isSmall);
            if (DiploRibbonData.areRibbonYieldsStuckOnScreen) { // If always showing, but no arrows, hide helper.
                this.toggleNavHelpContainer.classList.add("hidden");
            }
        }
        for (let cardIndex = 0; cardIndex < targetArray.length; cardIndex++) {
            const player = targetArray[cardIndex];
            const civFlagContainer = document.createElement("div");
            civFlagContainer.classList.add("diplo-ribbon-outer", "flex", "flex-row");
            if (player.playerColors) {
                civFlagContainer.setAttribute("style", player.playerColors);
            }
            civFlagContainer.setAttribute("data-player-id", player.id.toString());
            civFlagContainer.setAttribute("data-ribbon-index", cardIndex.toString());
            civFlagContainer.classList.toggle("primary-color-is-lighter", player.isPrimaryLighter);
            civFlagContainer.classList.toggle("show-on-hover", !DiploRibbonData.areRibbonYieldsStuckOnScreen);
            civFlagContainer.classList.toggle("local-player", player.id == GameContext.localPlayerID);
            civFlagContainer.classList.toggle("hidden", cardIndex < scrollIndex || cardIndex >= (scrollIndex + numShown));
            civFlagContainer.classList.toggle("diplo-ribbon__outer_small", !isDiplomacyHub);
            civFlagContainer.addEventListener("mouseenter", (event) => {
                event.stopPropagation();
                event.preventDefault();
                this.displayRibbonDetails(event.target);
            });
            civFlagContainer.addEventListener("mouseleave", (event) => {
                event.stopPropagation();
                event.preventDefault();
                this.hideRibbonDetails(event.target);
            });
            civFlagContainer.addEventListener("engine-input", this.civFlagEngineInputListener);
            this.diploRibbons[cardIndex] = civFlagContainer;
            const civFlagContent = document.createElement('div');
            civFlagContent.classList.add('diplo-ribbon_content-container');
            //==========================
            // MAIN BG
            //==========================
            const diploMainBGContainer = document.createElement('div');
            diploMainBGContainer.classList.value = "diplo-ribbon__bg-container absolute w-24 h-full top-4 pointer-events-auto group"; // TODO: Get group working with our version of Tailwind CSS
            civFlagContent.appendChild(diploMainBGContainer);
            const diploMainBG = document.createElement('div');
            diploMainBG.classList.value = 'diplo-ribbon__bg absolute inset-0';
            diploMainBGContainer.appendChild(diploMainBG);
            // Only shows when focus/selected
            const bgHighlight = document.createElement('div');
            bgHighlight.classList.value = "diplo-ribbon__bg-highlight absolute inset-0";
            diploMainBGContainer.appendChild(bgHighlight);
            //==========================
            // Tokens
            //==========================
            const diploTokens = document.createElement('div');
            diploTokens.classList.add('diplo-ribbon__tokens');
            this.civFlagFlexboxPartOne = diploTokens;
            civFlagContent.appendChild(diploTokens);
            const civLeaderTopBG = document.createElement('div');
            const playerConfig = Configuration.getPlayer(player.id);
            civLeaderTopBG.classList.value = 'diplo-ribbon__upper-bg absolute top-0 w-16 h-36 flex flex-col items-center pointer-events-none';
            let topBG = `
				<div class="diplo-ribbon__front-banner absolute inset-0"></div>
				<div class="diplo-ribbon__front-banner-shadow absolute inset-0"></div>
				<div class="diplo-ribbon__front-banner-overlay absolute inset-0"></div>
				<div class="diplo-ribbon__symbol bg-contain bg-center bg-no-repeat relative mt-16 w-9 h-9" style="background-image: url('${player.civSymbol}')"></div>
			`;
            if (Configuration.getGame().isNetworkMultiplayer && Game.Diplomacy.hasTeammate(player.id)) {
                topBG = topBG + `
					<div class="diplo-ribbon__team-overlay bg-cob bg-center bg-no-repeat relative" style='fxs-background-image-tint: ${multiplayerTeamColors[playerConfig.team + 1]}'></div>
					<div class="diplo-ribbon__team-text relative font-body-base text-white text-shadow">${(playerConfig.team + 1).toString()}</div>
				`;
            }
            civLeaderTopBG.innerHTML = topBG;
            this.civFlagFlexboxPartOne.appendChild(civLeaderTopBG);
            const civLeader = document.createElement('fxs-activatable');
            civLeader.classList.add('diplo-ribbon__portrait');
            civLeader.setAttribute("data-tut-highlight", "founderHighlight");
            civLeader.setAttribute("data-audio-group-ref", "audio-panel-diplo-ribbon");
            civLeader.setAttribute("data-audio-focus-ref", "none");
            civLeader.setAttribute("data-player-id", player.id.toString());
            const civLeaderHexBGShadow = document.createElement('div');
            civLeaderHexBGShadow.classList.value = 'diplo-ribbon__portrait-hex-bg-shadow bg-contain bg-center bg-no-repeat inset-0 absolute';
            civLeader.appendChild(civLeaderHexBGShadow);
            const civLeaderHexBG = document.createElement('div');
            civLeaderHexBG.classList.value = 'diplo-ribbon__portrait-hex-bg bg-contain bg-center bg-no-repeat inset-0 absolute';
            civLeader.appendChild(civLeaderHexBG);
            const civLeaderHexBGFrame = document.createElement('div');
            civLeaderHexBGFrame.classList.value = 'diplo-ribbon__portrait-hex-bg-frame bg-contain bg-center bg-no-repeat inset-0 absolute';
            civLeader.appendChild(civLeaderHexBGFrame);
            const civLeaderHitbox = document.createElement('div');
            civLeaderHitbox.classList.add('diplo-ribbon__portrait-hitbox');
            civLeaderHitbox.setAttribute("data-tooltip-content", player.name);
            civLeader.appendChild(civLeaderHitbox);
            const portrait = document.createElement("fxs-icon");
            portrait.classList.value = "diplo-ribbon__portrait-image absolute size-26 -left-2\\.5";
            portrait.setAttribute("data-icon-id", player.leaderType);
            portrait.setAttribute("data-icon-context", player.portraitContext);
            portrait.classList.toggle("turn-active", player.isTurnActive);
            portrait.classList.toggle("-scale-x-100", player.id != GameContext.localPlayerID);
            civLeader.appendChild(portrait);
            const relationContainer = document.createElement('div');
            relationContainer.classList.add('diplo-ribbon__relation-container');
            const relationshipIcon = document.createElement("fxs-activatable");
            relationshipIcon.classList.value = "relationship-icon relative bg-contain bg-center bg-no-repeat pointer-events-auto self-center w-18 h-9";
            relationshipIcon.classList.toggle("hidden", player.relationshipIcon == '');
            relationshipIcon.style.backgroundImage = `url('${player.relationshipIcon}')`;
            relationshipIcon.setAttribute("data-player-id", player.id.toString());
            if (!isMobileViewExperience) {
                relationshipIcon.setAttribute('data-tooltip-style', "relationship");
            }
            relationContainer.appendChild(relationshipIcon);
            relationshipIcon.addEventListener('action-activate', (event) => {
                const target = event.target;
                if (target instanceof HTMLElement) {
                    const playerID = target.getAttribute("data-player-id");
                    if (!playerID) {
                        return;
                    }
                    const playerIDInt = Number.parseInt(playerID);
                    if (isNaN(playerIDInt) || playerIDInt == PlayerIds.NO_PLAYER) {
                        console.error("panel-diplo-ribbon: invalid playerID parsed from data-player-id attribute (" + playerID + ") during action-activate callback.");
                        return;
                    }
                    DiploRibbonData.sectionSelected = {
                        playerId: playerIDInt,
                        section: "relationship"
                    };
                }
                // The engine input in the activatable component stops the propagation, let's re-send the event...
                civLeader.dispatchEvent(new ActionActivateEvent(event.detail.x, event.detail.y));
            });
            const warSupport = document.createElement("div");
            warSupport.classList.value = "diplo-ribbon__war-support-count relative pointer-events-auto self-center flex justify-center items-center font-base text-2xs mt-1\\.25 -ml-px w-11 h-3\\.5";
            warSupport.classList.toggle("hidden", !player.isAtWar || InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG"));
            warSupport.classList.toggle("positive", player.warSupport > 0);
            warSupport.classList.toggle("negative", player.warSupport < 0);
            warSupport.setAttribute("data-player-id", player.id.toString());
            warSupport.setAttribute("data-l10n-id", player.warSupport.toString());
            if (!isMobileViewExperience) {
                warSupport.setAttribute('data-tooltip-style', "relationship");
            }
            relationContainer.appendChild(warSupport);
            civLeader.appendChild(relationContainer);
            civLeader.addEventListener('focus', (event) => {
                this.mainContainer.classList.add("cards-focused");
                this.displayRibbonDetails(event.target);
            });
            civLeader.addEventListener('blur', (event) => {
                this.mainContainer.classList.remove("cards-focused");
                this.hideRibbonDetails(event.target);
            });
            civLeader.setAttribute("data-player-id", player.id.toString());
            civLeader.classList.toggle("can-click-leader-icon", player.canClick);
            civLeader.classList.toggle("selected", player.selected);
            civLeader.classList.toggle("local-player", player.id == GameContext.localPlayerID);
            civLeader.classList.toggle("turn-active", player.isTurnActive);
            civLeader.addEventListener("action-activate", (event) => {
                event.stopPropagation();
                event.preventDefault();
                const target = event.target;
                if (target.classList.contains("can-click-leader-icon")) {
                    const targetID = target.getAttribute("data-player-id");
                    if (targetID) {
                        const targetIDInt = Number.parseInt(targetID);
                        if (isNaN(targetIDInt) || targetIDInt == PlayerIds.NO_PLAYER) {
                            console.error("panel-diplo-ribbon: invalid playerID parsed from data-player-id attribute (" + targetID + ") during action-activate callback.");
                            return;
                        }
                        //Check if we have a player met notification for this player
                        const notificationIDs = Game.Notifications.getIdsForPlayer(GameContext.localPlayerID);
                        if (notificationIDs) {
                            let hasFirstMeet = false;
                            for (const notificationID of notificationIDs) {
                                const notification = Game.Notifications.find(notificationID);
                                if (notification && Game.Notifications.getTypeName(notification.Type) == "NOTIFICATION_PLAYER_MET" && notification.Player == targetIDInt) {
                                    Game.Notifications.activate(notificationID);
                                    hasFirstMeet = true;
                                    return;
                                }
                            }
                            if (hasFirstMeet) {
                                return;
                            }
                        }
                        window.dispatchEvent(new RaiseDiplomacyEvent(targetIDInt));
                        if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB")) {
                            window.dispatchEvent(new UpdateDiploRibbonEvent());
                        }
                    }
                    if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB")) {
                        if (Players.get(DiplomacyManager.selectedPlayerID)?.isIndependent) {
                            return;
                        }
                        else {
                            if (DiplomacyManager.selectedPlayerID == GameContext.localPlayerID) {
                                this.Root.classList.add("local-player-diplomacy-hub-ribbon");
                                this.Root.classList.remove("other-player-diplomacy-hub-ribbon");
                            }
                            else {
                                this.Root.classList.add("other-player-diplomacy-hub-ribbon");
                                this.Root.classList.remove("local-player-diplomacy-hub-ribbon");
                            }
                        }
                    }
                }
            });
            this.civFlagFlexboxPartOne.appendChild(civLeader);
            const civFlagYieldFlex = document.createElement("div");
            civFlagYieldFlex.classList.value = "diplo-ribbon__yields flow-column items-stretch relative px-1 mt-14";
            for (let yieldIndex = 0; yieldIndex < player.displayItems.length; yieldIndex++) {
                const yieldData = player.displayItems[yieldIndex];
                const yieldItem = document.createElement("fxs-activatable");
                yieldItem.classList.add("yield-item", "flow-row", "items-center", "pointer-events-auto");
                yieldItem.classList.toggle("font-title-sm", isMobileViewExperience);
                yieldItem.classList.toggle("font-title-base", !isMobileViewExperience);
                yieldItem.classList.toggle('tint-bg', yieldIndex % 2 == 0);
                yieldItem.classList.toggle('last', yieldIndex == player.displayItems.length - 1);
                yieldItem.classList.add(`yield-colors--${yieldData.type}`);
                yieldItem.setAttribute("data-tooltip-content", yieldData.label);
                yieldItem.addEventListener('action-activate', this.yieldsItemListener);
                const yieldLabel = document.createElement("div");
                yieldLabel.classList.add("flow-column", "flex-auto", "justify-center", "yield-label");
                yieldLabel.innerHTML = yieldData.img;
                yieldItem.appendChild(yieldLabel);
                const yieldValue = document.createElement("div");
                yieldValue.classList.add("yield-value");
                yieldValue.setAttribute("data-l10n-id", yieldData.value.toString());
                yieldValue.setAttribute("data-tooltip-content", yieldData.details);
                yieldItem.classList.add(`text-yield-${yieldData.type}`);
                yieldItem.classList.add(`group-hover: opactiy-50`); // TODO: get this working with our version of Tailwind CSS
                yieldItem.appendChild(yieldValue);
                civFlagYieldFlex.appendChild(yieldItem);
            }
            civFlagContent.appendChild(civFlagYieldFlex);
            if (DiploRibbonData.ribbonDisplayTypes.length > 0) {
                const diploBottomSpacer = document.createElement('div');
                diploBottomSpacer.classList.add('diplo-ribbon__bottom-spacer');
                civFlagContent.appendChild(diploBottomSpacer);
            }
            civFlagContainer.appendChild(civFlagContent);
            this.mainContainer.appendChild(civFlagContainer);
        }
        // if we have enough leaders to scroll, add the right arrow now
        if (targetArray.length > this.numLeadersToShow) {
            const rightArrowBG = document.createElement("div");
            rightArrowBG.classList.add("diplo-ribbon__arrow-bg", "w-12", "h-14", "relative", "align-center", "self-start", "mt-4");
            rightArrowBG.classList.toggle("diplo-ribbon__arrow-bg-right", !isDiplomacyHub);
            rightArrowBG.classList.toggle("diplo-hub-ribbon__arrow-bg-right", isDiplomacyHub);
            const rightArrow = document.createElement("fxs-activatable");
            rightArrow.classList.add("diplo-ribbon-right-arrow", "absolute", "inset-0", "align-center", "bg-no-repeat", "bg-cover", "w-12", "h-14", "self-start", "-scale-x-100");
            if (this.firstLeaderIndex < (targetArray.length - this.numLeadersToShow)) {
                rightArrow.classList.add('img-arrow');
            }
            else {
                rightArrow.classList.add('img-arrow-disabled');
                rightArrow.setAttribute("disabled", "true");
            }
            rightArrow.classList.toggle('cursor-not-allowed', this.firstLeaderIndex >= (targetArray.length - this.numLeadersToShow));
            rightArrow.classList.toggle('cursor-pointer', this.firstLeaderIndex < (targetArray.length - this.numLeadersToShow));
            rightArrow.addEventListener(ActionActivateEventName, this.leadersRightListener);
            rightArrowBG.appendChild(rightArrow);
            this.mainContainer.appendChild(rightArrowBG);
        }
        this.navHelpRight = document.createElement("fxs-nav-help");
        this.navHelpRight.classList.add("h-16", "diplo-hub-ribbon-right-arrow__nav-help");
        if (!isDiplomacyHub) {
            this.navHelpRight.classList.add("opacity-0", "diplo-ribbon-right-arrow__nav-help");
            this.navHelpRight.setAttribute("action-key", "inline-nav-next");
        }
        else {
            this.navHelpRight.setAttribute("action-key", "inline-nav-shell-next");
        }
        this.mainContainer.appendChild(this.navHelpRight);
        if (isDiplomacyHub) {
            this.Root.addEventListener(NavigateInputEventName, this.navigateInputListener);
        }
        else {
            this.Root.removeEventListener(NavigateInputEventName, this.navigateInputListener);
        }
        this.attachAttributeButton();
    }
    onModelUpdate() {
        let targetArray = null;
        if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG") || InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS") || InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_PROJECT_REACTION")) {
            targetArray = DiploRibbonData.diploStatementPlayerData;
        }
        else {
            targetArray = DiploRibbonData.playerData;
        }
        // If there's a mismatch (player added/removed) do a full rebuild
        if (targetArray.length != this.diploRibbons.length) {
            this.populateFlags();
            return;
        }
        // set the portrait array
        const availablePortraits = [];
        const leaderPortraits = this.Root.getElementsByClassName("diplo-ribbon__portrait");
        for (let numportraits = 0; numportraits < leaderPortraits.length; numportraits++) {
            if (leaderPortraits[numportraits].hasAttribute("data-player-id")) {
                availablePortraits.push({ key: leaderPortraits[numportraits].getAttribute("data-player-id"), value: leaderPortraits[numportraits] });
            }
        }
        // set the flag container array
        const availableFlags = [];
        const flags = this.Root.getElementsByClassName("diplo-ribbon-outer");
        for (let numflags = 0; numflags < flags.length; numflags++) {
            if (flags[numflags].hasAttribute("data-player-id")) {
                availableFlags.push({ key: flags[numflags].getAttribute("data-player-id"), value: flags[numflags] });
            }
        }
        // set the war support array
        const availableWarSupport = [];
        const warSupport = this.Root.getElementsByClassName("diplo-ribbon__war-support-count");
        for (let numsupport = 0; numsupport < flags.length; numsupport++) {
            if (warSupport[numsupport].hasAttribute("data-player-id")) {
                availableWarSupport.push({ key: warSupport[numsupport].getAttribute("data-player-id"), value: warSupport[numsupport] });
            }
        }
        // set the relationship icon array
        const availableRelationshipIcons = [];
        const relationshipIcon = this.Root.getElementsByClassName("relationship-icon");
        for (let numicons = 0; numicons < flags.length; numicons++) {
            if (relationshipIcon[numicons].hasAttribute("data-player-id")) {
                availableRelationshipIcons.push({ key: relationshipIcon[numicons].getAttribute("data-player-id"), value: relationshipIcon[numicons] });
            }
        }
        let scrollIndex = 0;
        // if we have enough leaders visible to scroll, set up the left arrow
        if (targetArray.length > this.numLeadersToShow) {
            scrollIndex = this.firstLeaderIndex;
        }
        const numShown = Math.min(targetArray.length, this.numLeadersToShow);
        let inHub = false;
        if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB")) {
            inHub = true;
        }
        for (let cardIndex = 0; cardIndex < targetArray.length; cardIndex++) {
            const player = targetArray[cardIndex];
            this.diploRibbons[cardIndex].classList.toggle("show-on-hover", !DiploRibbonData.areRibbonYieldsStuckOnScreen);
            const portrait = MustGetElement(".diplo-ribbon__portrait-image", this.diploRibbons[cardIndex]);
            portrait.classList.toggle("turn-active", player.isTurnActive);
            portrait.setAttribute("data-icon-id", player.leaderType);
            portrait.setAttribute("data-icon-context", player.portraitContext);
            const relationshipIcon = MustGetElement(".relationship-icon", this.diploRibbons[cardIndex]);
            relationshipIcon.classList.toggle("hidden", player.relationshipIcon == '');
            relationshipIcon.style.backgroundImage = `url('${player.relationshipIcon}')`;
            const warSupport = MustGetElement(".diplo-ribbon__war-support-count", this.diploRibbons[cardIndex]);
            warSupport.classList.toggle("hidden", !player.isAtWar);
            warSupport.classList.toggle("positive", player.warSupport > 0);
            warSupport.classList.toggle("negative", player.warSupport < 0);
            for (let numflags = 0; numflags < availablePortraits.length; numflags++) {
                if (availablePortraits[numflags].key == targetArray[cardIndex].id.toString()) {
                    const currentPortait = availablePortraits[numflags];
                    currentPortait.value.classList.toggle("can-click-leader-icon", targetArray[cardIndex].canClick);
                    currentPortait.value.classList.toggle("selected", targetArray[cardIndex].selected);
                    currentPortait.value.classList.toggle("local-player", targetArray[cardIndex].id == GameContext.localPlayerID);
                    currentPortait.value.classList.toggle("turn-active", player.isTurnActive);
                    const currentFlag = availableFlags[numflags];
                    currentFlag.value.classList.toggle("can-click-leader-icon", targetArray[cardIndex].canClick);
                    currentFlag.value.classList.toggle("primary-color-is-lighter", targetArray[cardIndex].isPrimaryLighter);
                    currentFlag.value.classList.toggle("show-on-hover", !DiploRibbonData.areRibbonYieldsStuckOnScreen);
                    currentFlag.value.classList.toggle("local-player", targetArray[cardIndex].id == GameContext.localPlayerID);
                    currentFlag.value.classList.toggle("hidden", cardIndex < scrollIndex || cardIndex >= (scrollIndex + numShown));
                    currentFlag.value.classList.toggle("diplo-ribbon__outer_small", !inHub);
                    const currentWarSupport = availableWarSupport[numflags];
                    currentWarSupport.value.classList.toggle("hidden", !targetArray[cardIndex].isAtWar);
                    currentWarSupport.value.classList.toggle("positive", targetArray[cardIndex].warSupport > 0);
                    currentWarSupport.value.classList.toggle("negative", targetArray[cardIndex].warSupport < 0);
                    currentWarSupport.value.setAttribute("data-l10n-id", targetArray[cardIndex].warSupport.toString());
                    const currentRelationshipIcon = availableRelationshipIcons[numflags];
                    currentRelationshipIcon.value.classList.toggle("hidden", !targetArray[cardIndex].isAtWar);
                    currentRelationshipIcon.value.classList.toggle("hidden", targetArray[cardIndex].relationshipIcon == '');
                    currentRelationshipIcon.value.setAttribute("data-bg-image", `url('${targetArray[cardIndex].relationshipIcon}')`);
                }
            }
            const civFlagYieldFlex = MustGetElement(".diplo-ribbon__yields", this.diploRibbons[cardIndex]);
            for (let yieldIndex = 0; yieldIndex < player.displayItems.length; yieldIndex++) {
                const y = player.displayItems[yieldIndex];
                const yieldItem = civFlagYieldFlex.children[yieldIndex];
                if (!yieldItem) {
                    console.error(`panel-diplo-ribbon: onModelUpdate() - could not find child for civFlagYieldFlex at index ${yieldIndex}.`);
                    console.error(`    civFlagYieldFlex has ${civFlagYieldFlex.children.length} children, while ${Locale.compose(player.civName)} has ${player.displayItems.length} display items.`);
                    continue;
                }
                yieldItem.setAttribute("data-tooltip-content", y.label);
                const yieldValue = MustGetElement(".yield-value", yieldItem);
                yieldValue.setAttribute("data-l10n-id", y.value.toString());
                yieldValue.setAttribute("data-tooltip-content", y.details);
            }
        }
        if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB")) {
            if (Players.get(DiplomacyManager.selectedPlayerID)?.isIndependent) {
                this.Root.classList.add("other-player-diplomacy-hub-ribbon");
                this.Root.classList.remove("local-player-diplomacy-hub-ribbon");
            }
            else {
                this.Root.classList.toggle('local-player-diplomacy-hub-ribbon', DiplomacyManager.selectedPlayerID == GameContext.localPlayerID);
                this.Root.classList.toggle('other-player-diplomacy-hub-ribbon', DiplomacyManager.selectedPlayerID != GameContext.localPlayerID);
            }
        }
    }
    /**
     * TODO: Move this check as a method off of the Diplomacy Manager so it can return true for any variety of modes.
     * @returns If showing the ribbon as part of the diplomacy mdoe.
     */
    isInDiplomacyMode() {
        return InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB")
            || InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG")
            || InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_PROJECT_REACTION")
            || InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS"); // TODO: Diplomacy based mode?  If so, may want a "DIPLOMACY" in that mode name.
    }
    /**
     * Update the banners.
     * This may occur for a variety of events such as being toggled, scrolled, etc...
     */
    onUpdateBanners(_event) {
        if (DiploRibbonData.userDiploRibbonsToggled) {
            // Only setup focus changes if in the world view.
            const isDiplomacyHub = this.isInDiplomacyMode();
            if (!isDiplomacyHub) {
                Audio.playSound("data-audio-focus", "audio-panel-diplo-ribbon");
                // If ribbon is always showing, and there are no arrows, then no need to take focus.
                if (DiploRibbonData.areRibbonYieldsStuckOnScreen && !this.panArrows) {
                    return;
                }
                Input.setActiveContext(InputContext.Dual);
                FocusManager.setFocus(this.mainContainer);
                this.mainContainer.addEventListener(NavigateInputEventName, this.navigateInputListener);
                this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
                ContextManager.push('panel-diplo-ribbon-fake');
                this.toggleNavHelp.setAttribute("action-key", "inline-nav-up");
                if (this.panArrows) {
                    this.navHelpLeft.classList.remove("opacity-0");
                    this.navHelpRight.classList.remove("opacity-0");
                }
            }
        }
        else {
            Audio.playSound("data-audio-unfocus", "audio-panel-diplo-ribbon");
        }
        if (!DiploRibbonData.userDiploRibbonsToggled && !FocusManager.isWorldFocused()) {
            // If the active control type switches at any time, we end up here.
            // Make sure we're actually active before blindly tearing ourselves down.
            const curTarget = ContextManager.getCurrentTarget();
            if (!curTarget || (curTarget && curTarget.localName != "PANEL-DIPLO-RIBBON-FAKE")) {
                return;
            }
            Input.setActiveContext(InputContext.World);
            FocusManager.SetWorldFocused();
            this.mainContainer.removeEventListener(NavigateInputEventName, this.navigateInputListener);
            this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
            ContextManager.pop('panel-diplo-ribbon-fake');
            this.toggleNavHelp.setAttribute("action-key", "inline-toggle-diplo");
            this.navHelpLeft.classList.add("opacity-0");
            this.navHelpRight.classList.add("opacity-0");
        }
        // TODO: Radial dock needs to signal off of something other than being attached/detatched - otherwise this needs to be done everywhere in the world HUD.
        // Single radial menu show/hides based on harness, and we're still in the World harness
        // but the radial menu doesn't accept input at this point, show/hide it based on this focus state.
        const radialDock = document.getElementsByClassName("panel-radial-dock");
        if (radialDock && radialDock[0]) {
            if (DiploRibbonData.userDiploRibbonsToggled)
                radialDock[0].classList.add("hidden");
            else
                radialDock[0].classList.remove("hidden");
        }
    }
    scrollLeadersLeft() {
        if (this.firstLeaderIndex > 0) {
            this.firstLeaderIndex--;
            this.refreshRibbonVis();
        }
    }
    scrollLeadersRight() {
        let targetArray = null;
        if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG") || InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS") || InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_PROJECT_REACTION")) {
            targetArray = DiploRibbonData.diploStatementPlayerData;
        }
        else {
            targetArray = DiploRibbonData.playerData;
        }
        if (this.firstLeaderIndex < (targetArray.length - this.numLeadersToShow)) {
            this.firstLeaderIndex++;
            this.refreshRibbonVis();
        }
    }
    refreshRibbonVis() {
        const leftArrow = MustGetElement(".diplo-ribbon-left-arrow", this.mainContainer);
        const rightArrow = MustGetElement(".diplo-ribbon-right-arrow", this.mainContainer);
        let targetArray = null;
        if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG") || InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS") || InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_PROJECT_REACTION")) {
            targetArray = DiploRibbonData.diploStatementPlayerData;
        }
        else {
            targetArray = DiploRibbonData.playerData;
        }
        for (let index = 0; index < targetArray.length; index++) {
            this.diploRibbons[index].classList.toggle("hidden", index < this.firstLeaderIndex || index >= (this.firstLeaderIndex + this.numLeadersToShow));
        }
        leftArrow.classList.toggle('img-arrow', this.firstLeaderIndex > 0);
        leftArrow.classList.toggle('img-arrow-disabled', this.firstLeaderIndex == 0);
        if (this.navHelpLeft) {
            this.navHelpLeft.classList.toggle("opacity-0", this.firstLeaderIndex == 0);
        }
        if (this.firstLeaderIndex > 0) {
            leftArrow.removeAttribute("disabled");
        }
        else {
            leftArrow.setAttribute("disabled", "true");
        }
        rightArrow.classList.toggle('img-arrow', this.firstLeaderIndex < (targetArray.length - this.numLeadersToShow));
        rightArrow.classList.toggle('img-arrow-disabled', this.firstLeaderIndex >= (targetArray.length - this.numLeadersToShow));
        if (this.navHelpRight) {
            this.navHelpRight.classList.toggle("opacity-0", this.firstLeaderIndex >= (targetArray.length - this.numLeadersToShow));
        }
        if (this.firstLeaderIndex < (targetArray.length - this.numLeadersToShow)) {
            rightArrow.removeAttribute("disabled");
        }
        else {
            rightArrow.setAttribute("disabled", "true");
        }
    }
    displayRibbonDetails(target) {
        if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB") || InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG")) {
            return;
        }
        const targetID = target.getAttribute("data-player-id");
        if (targetID == null) {
            console.error("panel-diplo-ribbon: Attempting to hover a leader portrait without a 'data-player-id' attribute!");
            return;
        }
        const targetIDInt = Number.parseInt(targetID);
        if (isNaN(targetIDInt) || targetIDInt == PlayerIds.NO_PLAYER) {
            console.error("panel-diplo-ribbon: invalid playerID parsed from data-player-id attribute (" + targetID + ") during hover callback.");
            return;
        }
        if (targetIDInt != GameContext.localPlayerID) {
            Audio.playSound("data-audio-focus", "audio-panel-diplo-ribbon");
            return;
        }
        if (!target.parentElement?.parentElement) {
            console.error("panel-diplo-ribbon: No valid parent element while attempting to hover a portrait!");
            return;
        }
        const civFlagContainers = this.Root.querySelectorAll(".diplo-ribbon-outer");
        for (const civFlagContainer of civFlagContainers) {
            civFlagContainer.classList.add("hover-all");
        }
        this.isHoverAll = true;
        Audio.playSound("data-audio-focus", "audio-panel-diplo-ribbon");
    }
    hideRibbonDetails(target) {
        if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB") || InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG")) {
            return;
        }
        const targetID = target.getAttribute("data-player-id");
        if (targetID == null) {
            console.error("panel-diplo-ribbon: Attempting to un-hover a leader portrait without a 'data-player-id' attribute!");
            return;
        }
        const targetIDInt = Number.parseInt(targetID);
        if (isNaN(targetIDInt) || targetIDInt == PlayerIds.NO_PLAYER) {
            console.error("panel-diplo-ribbon: invalid playerID parsed from data-player-id attribute (" + targetID + ") during mouseleave callback.");
            return;
        }
        if (targetIDInt != GameContext.localPlayerID) {
            return;
        }
        if (!target.parentElement?.parentElement) {
            console.error("panel-diplo-ribbon: No valid parent element while attempting to un-hover a portrait!");
            return;
        }
        const civFlagContainers = this.Root.querySelectorAll(".diplo-ribbon-outer");
        for (const civFlagContainer of civFlagContainers) {
            civFlagContainer.classList.remove("hover-all");
        }
        this.isHoverAll = false;
    }
    onEngineCaptureAllInput(inputEvent) {
        if (!this.handleEngineCaptureAllInput(inputEvent)) {
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
        ;
    }
    handleEngineCaptureAllInput(inputEvent) {
        switch (inputEvent.detail.name) {
            case 'touch-complete':
                if (this.isHoverAll) {
                    const civFlagContainers = this.Root.querySelectorAll(".diplo-ribbon-outer");
                    civFlagContainers.forEach(civFlagContainer => civFlagContainer.classList.remove("hover-all"));
                    this.isHoverAll = false;
                }
                return true;
        }
        return true;
    }
    onCivFlagEngineInput(inputEvent) {
        if (!this.handleCivFlagEngineInput(inputEvent)) {
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
        ;
    }
    handleCivFlagEngineInput(inputEvent) {
        switch (inputEvent.detail.name) {
            case 'touch-press':
                if (!this.isHoverAll) {
                    const civFlagContainers = this.Root.querySelectorAll(".diplo-ribbon-outer");
                    civFlagContainers.forEach(civFlagContainer => civFlagContainer.classList.add("hover-all"));
                    Audio.playSound("data-audio-focus", "audio-panel-diplo-ribbon");
                    this.isHoverAll = true;
                }
                return false;
        }
        return true;
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        switch (inputEvent.detail.name) {
            case 'cancel':
                DiploRibbonData.userDiploRibbonsToggled = DiploRibbonData.userDiploRibbonsToggled == RibbonStatsToggleStatus.RibbonStatsShowing ? RibbonStatsToggleStatus.RibbonStatsHidden : RibbonStatsToggleStatus.RibbonStatsShowing;
                window.dispatchEvent(new UpdateDiploRibbonEvent());
                inputEvent.stopPropagation();
                inputEvent.preventDefault();
                break;
            case 'sys-menu': // pause
            case 'shell-action-5': // social
                DiploRibbonData.userDiploRibbonsToggled = DiploRibbonData.userDiploRibbonsToggled == RibbonStatsToggleStatus.RibbonStatsShowing ? RibbonStatsToggleStatus.RibbonStatsHidden : RibbonStatsToggleStatus.RibbonStatsShowing;
                window.dispatchEvent(new UpdateDiploRibbonEvent());
                // Don't kill input so it falls through and activates the system/social menus
                break;
        }
    }
    onNavigateInput(inputEvent) {
        // Prevent input from navigating away (to adjacent harness slots).
        if (inputEvent.detail.name == 'nav-left' || inputEvent.detail.name == 'nav-right' || inputEvent.detail.name == 'nav-move') {
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
            return;
        }
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        let isDiploMode = true;
        const curTarget = ContextManager.getCurrentTarget();
        if (curTarget && curTarget.localName == "PANEL-DIPLO-RIBBON-FAKE") {
            isDiploMode = false;
        }
        if (!isDiploMode && inputEvent.detail.name == 'nav-up') {
            DiploRibbonData.userDiploRibbonsToggled = DiploRibbonData.userDiploRibbonsToggled == RibbonStatsToggleStatus.RibbonStatsShowing ? RibbonStatsToggleStatus.RibbonStatsHidden : RibbonStatsToggleStatus.RibbonStatsShowing;
            window.dispatchEvent(new UpdateDiploRibbonEvent());
            Audio.playSound("data-audio-focus", "audio-panel-diplo-ribbon");
            return;
        }
        inputEvent.stopPropagation();
        inputEvent.preventDefault();
        if (inputEvent.detail.name == 'nav-next' || inputEvent.detail.name == 'nav-previous') {
            if (InterfaceMode.isInDefaultMode()) {
                switch (inputEvent.detail.name) {
                    case 'nav-next':
                        this.scrollLeadersRight();
                        break;
                    case 'nav-previous':
                        this.scrollLeadersLeft();
                        break;
                }
            }
        }
        // processing past here is the original diplo mode leader select
        if (!isDiploMode) {
            return;
        }
        // Check which array of player data we want to use
        let targetArray = null;
        if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG") || InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS") || InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_PROJECT_REACTION")) {
            targetArray = DiploRibbonData.diploStatementPlayerData;
        }
        else {
            targetArray = DiploRibbonData.playerData;
        }
        // get leaderId based on next or previous sibling data-player-id
        const selectedCard = this.mainContainer?.querySelector(".selected")?.parentElement?.parentElement?.parentElement;
        if (!selectedCard) {
            console.error("diplo-ribbon: Couldn't find selected ribbon");
            return;
        }
        const currentIndex = selectedCard.getAttribute("data-ribbon-index");
        if (!currentIndex) {
            console.error("diplo-ribbon: Couldn't find data-ribbon-index on selected ribbon");
            return;
        }
        const currentLeaderIdx = Number.parseInt(currentIndex);
        let selectedIndex = 0;
        if (inputEvent.detail.name == 'nav-shell-previous') {
            if (currentLeaderIdx > 0) {
                selectedIndex = currentLeaderIdx - 1;
            }
            else {
                return;
            }
        }
        else {
            if (currentLeaderIdx < (targetArray.length - 1)) {
                selectedIndex = currentLeaderIdx + 1;
            }
            else {
                return;
            }
        }
        const nextLeaderId = targetArray[selectedIndex].id;
        window.dispatchEvent(new RaiseDiplomacyEvent(nextLeaderId));
        for (let index = 0; index < this.diploRibbons.length; index++) {
            const diploRibbon = this.diploRibbons[index];
            const civLeader = MustGetElement(".diplo-ribbon__portrait", diploRibbon);
            const idString = diploRibbon.getAttribute("data-player-id");
            const thisId = Number.parseInt(idString ? idString : "");
            civLeader.classList.toggle("selected", thisId == nextLeaderId);
        }
        if (this.diploRibbons.length >= this.numLeadersToShow) {
            if (selectedIndex < (this.numLeadersToShow - 1)) {
                this.firstLeaderIndex = 0;
            }
            else {
                this.firstLeaderIndex = selectedIndex - (this.numLeadersToShow - 1);
            }
            this.refreshRibbonVis();
        }
        if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB")) {
            if (Players.get(DiplomacyManager.selectedPlayerID)?.isIndependent) {
                return;
            }
            else {
                if (DiplomacyManager.selectedPlayerID == GameContext.localPlayerID) {
                    this.Root.classList.add("local-player-diplomacy-hub-ribbon");
                    this.Root.classList.remove("other-player-diplomacy-hub-ribbon");
                }
                else {
                    this.Root.classList.add("other-player-diplomacy-hub-ribbon");
                    this.Root.classList.remove("local-player-diplomacy-hub-ribbon");
                }
            }
        }
        window.dispatchEvent(new UpdateDiploRibbonEvent());
    }
    onShowPlayerYieldReport() {
        ContextManager.push("player-yields-report-screen", { singleton: true, createMouseGuard: true });
    }
    attachAttributeButton() {
        waitUntilValue(() => { return this.Root.querySelector(".diplo-ribbon__portrait.local-player"); }).then(() => {
            const localPlayerPortrait = this.Root.querySelector(".diplo-ribbon__portrait.local-player");
            if (!localPlayerPortrait) {
                console.error("panel-diplo-ribbon: Unable to find diplo ribbon portrait for the local player");
                return;
            }
            this.attributeButton = document.createElement("fxs-activatable");
            this.attributeButton.classList.value = "diplo-ribbon__attribute-button -left-1 bottom-3 h-10 absolute flex items-center justify-center";
            const buttonNumber = document.createElement("div");
            buttonNumber.classList.value = "diplo-ribbon__attribute-button-number font-body text-sm mt-2 px-4";
            buttonNumber.innerHTML = '-1';
            this.attributeButton.appendChild(buttonNumber);
            //dummy div for placing the tutorial highlight.
            const tutorialHighlight = document.createElement("div");
            tutorialHighlight.classList.value = "diplo-ribbon__attribute-button-highlight absolute inset-0";
            tutorialHighlight.setAttribute("data-tut-highlight", "founderHighlight");
            this.attributeButton.appendChild(tutorialHighlight);
            this.attributeButton.addEventListener('action-activate', this.clickAttributeButton);
            localPlayerPortrait.appendChild(this.attributeButton);
            this.updateAttributeButton();
        });
    }
    updateAttributeButton() {
        if (!this.attributeButton) {
            console.error("panel-diplo-ribbon: Unable to find attribute button, skipping update of turn timers");
            return;
        }
        const localPlayer = Players.getEverAlive()[GameContext.localPlayerID];
        if (localPlayer == null) {
            return; // autoplaying
        }
        let attributePoints = 0;
        // Add attribute data
        if (localPlayer.Identity) {
            for (let attributeDef of GameInfo.Attributes) {
                attributePoints += localPlayer.Identity.getAvailableAttributePoints(attributeDef.AttributeType);
            }
        }
        if (attributePoints > 0 && !InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG")) {
            this.attributeButton.classList.remove("hidden");
        }
        else {
            this.attributeButton.classList.add("hidden");
            return;
        }
        const pointsNumberElement = MustGetElement(".diplo-ribbon__attribute-button-number", this.attributeButton);
        pointsNumberElement.innerHTML = attributePoints.toString();
    }
    onAttributePointsUpdated(data) {
        if (data && data.player && data.player != GameContext.localPlayerID) {
            //Not us, we don't need to update
            return;
        }
        this.updateAttributeButton();
    }
    clickAttributeButton() {
        ContextManager.push("screen-attribute-trees", { singleton: true, createMouseGuard: true });
    }
    onInterfaceModeChanged() {
        if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_PEACE_DEAL")) {
            this.Root.classList.add("hidden");
        }
        else if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG")) {
            this.Root.classList.add("diplomacy-dialog-ribbon");
            this.Root.classList.remove("other-player-diplomacy-hub-ribbon");
            this.Root.classList.remove("local-player-diplomacy-hub-ribbon");
            this.populateFlags();
        }
        else {
            this.Root.classList.remove("hidden");
        }
    }
    onInputContextChanged() {
        const context = Input.getActiveContext();
        const curTarget = ContextManager.getCurrentTarget();
        // if we're in the "down" state
        if (!DiploRibbonData.userDiploRibbonsToggled) {
            // and there's a target that isn't us (so not in ribbon scroll mode)
            if ((curTarget && curTarget.localName != "PANEL-DIPLO-RIBBON-FAKE") ||
                // or there's no target and we're not in World context
                (!curTarget && context != InputContext.World)) {
                // hide the "d-pad up" nav help for the ribbon
                if (this.toggleNavHelp) {
                    this.toggleNavHelp.classList.add("opacity-0");
                }
                return;
            }
        }
        // otherwise show the "d-pad up" nav help for the ribbon
        if (this.toggleNavHelp) {
            this.toggleNavHelp.classList.remove("opacity-0");
        }
    }
    /**
     * Player toggled options, this may have included always showing the ribbon so re-evaluate
     */
    onUserOptionChanged() {
        // Options changed but values may not be updated; 2 frame wait before realizing.
        const frames = 2;
        delayByFrame(() => {
            this.realizeNavHelp();
        }, frames);
    }
}
const BZ_BACKDROP = false;
const BZ_MAX_LEADERS = 19;
Controls.define('panel-diplo-ribbon', {
    createInstance: PanelDiploRibbon,
    description: "Houses the players' portraits and stats and start of diplomatic interactions",
    classNames: ['diplo-ribbon', 'relative', 'allowCameraMovement', 'top-8', 'right-24', 'pointer-events-none', 'trigger-nav-help'],
    styles: ['fs://game/base-standard/ui/diplo-ribbon/panel-diplo-ribbon.css'],
    images: ["hud_att_arrow", "hud_att_arrow_highlight"]
});

//# sourceMappingURL=file:///base-standard/ui/diplo-ribbon/panel-diplo-ribbon.js.map
