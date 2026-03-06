import { A as Audio } from '../../audio-base/audio-support.chunk.js';
import ActionHandler from '../../input/action-handler.js';
import FocusManager from '../../input/focus-manager.js';
import { N as NavTray } from '../../navigation-tray/model-navigation-tray.chunk.js';
import { P as Panel } from '../../panel-support.chunk.js';
import { MustGetElement } from '../../utilities/utilities-dom.chunk.js';
import '../../framework.chunk.js';
import '../../input/cursor.js';
import '../../views/view-manager.chunk.js';
import '../../input/input-support.chunk.js';
import '../../utilities/utilities-update-gate.chunk.js';
import '../../utilities/utilities-image.chunk.js';
import '../../utilities/utilities-component-id.chunk.js';

function compareInstalledMods(a, b) {
  if (a.length != b.length) {
    return false;
  } else {
    for (let i = 0; i < a.length; ++i) {
      if (a[i] != b[i]) {
        return false;
      }
    }
  }
  return true;
}
class ModsContent extends Panel {
  bzModAffectsSavedGame;
  mainSlot;
  modEntries;
  modNameHeader;
  modDateText;
  modDescriptionText;
  modDependenciesContent;
  modsEnableAll;
  modsDisableUser;
  selectedMod = null;
  selectedModIndex = 0;
  selectedModHandle = null;
  showNotOwnedContent = false;
  disableToggling = false;
  onModActivateListener = this.onModActivate.bind(this);
  onModFocusListener = this.onModFocus.bind(this);
  focusListener = this.onFocus.bind(this);
  modToggledActivateListener = this.onModToggled.bind(this);
  modsEnableAllListener = this.onModsEnableAll.bind(this);
  modsDisableUserListener = this.onModsDisableUser.bind(this);
  engineInputListener = this.onEngineInput.bind(this);
  refreshInterval = 0;
  installedModHandles = [];
  constructor(root) {
    super(root);
  }
  onInitialize() {
    super.onInitialize();
    this.Root.innerHTML = this.getContent();
    this.mainSlot = MustGetElement(".additional-content-mods", this.Root);
    this.modNameHeader = MustGetElement(".selected-mod-name", this.Root);
    this.modDateText = MustGetElement(".mod-date", this.Root);
    this.modDescriptionText = MustGetElement(".mod-description", this.Root);
    this.modDependenciesContent = MustGetElement(".mod-dependencies", this.Root);
    this.bzModAffectsSavedGame = MustGetElement(".mod-affects-saved-game", this.Root);
    this.modsEnableAll = MustGetElement(".mods-enable-all", this.Root);
    this.modsDisableUser = MustGetElement(".mods-disable-user", this.Root);
    if (Modding.userModSupportAvailable()) {
      this.modsDisableUser.classList.remove("hidden");
    } else {
      this.modsDisableUser.classList.add("hidden");
    }
    this.installedModHandles = Modding.getInstalledModHandles();
    this.renderModListContent();
    this.modEntries = this.Root.querySelectorAll(".mod-entry");
  }
  getContent() {
    return `
			<fxs-slot id="mods" class="additional-content-mods flex-auto relative flex flex-col items-stretch">
				<div class="no-mods-available w-full flex justify-center items-center flex-auto text-lg hidden" data-l10n-id="LOC_UI_MOD_NONE_AVAILABLE"></div>
				<fxs-hslot class="mods-available w-full justify-start items-stretch flex-auto">
					<fxs-vslot class="w-1\\/4">
						<fxs-scrollable class="mod-list-scrollable flex-auto relative -left-1" handle-gamepad-pan="true" attached-scrollbar="true">
							<fxs-vslot class="mod-list flex mx-1"></fxs-vslot>
						</fxs-scrollable>
					</fxs-vslot>
					<fxs-vslot class="w-1\\/2">
						<fxs-scrollable class="mod-details-scrollable flex-auto my-6 mx-6 px-4">
							<fxs-header filigree-style="none"
										class="selected-mod-name relative flex justify-center font-title text-2xl uppercase text-secondary mb-3"></fxs-header>
							<p class="mod-description text-lg my-6"></p>
							<p class="mod-author relative text-lg"></p>
							<p class="mod-date relative flex text-lg"></p>
							<p class="mod-affects-saved-game text-lg"></p>
							<fxs-vslot class="mod-dependencies hidden">
								<fxs-header filigree-style="none"
											class="mod-dependencies-title relative flex font-title text-lg uppercase text-secondary mb-3"
											title="LOC_UI_DEPENDENDENCIES"></fxs-header>
							</fxs-vslot>
						</fxs-scrollable>
						<div class="filigree-divider-inner-frame white-filigree-divider my-4" data-bind-class-toggle="hidden:{{g_NavTray.isTrayRequired}}||true"></div>
						<fxs-hslot class="justify-center items-center mx-6" data-bind-class-toggle="hidden:{{g_NavTray.isTrayRequired}}||true">
							<fxs-button class="toggle-enable" caption="LOC_ADVANCED_OPTIONS_ENABLE" tabindex="-1"></fxs-button>
						</fxs-hslot>
						<div class="filigree-divider-inner-frame white-filigree-divider my-4" data-bind-class-toggle="hidden:{{g_NavTray.isTrayRequired}}||true"></div>
						<fxs-hslot class="justify-center items-center mx-6" data-bind-class-toggle="hidden:{{g_NavTray.isTrayRequired}}">
							<fxs-button class="mods-enable-all flex-auto max-w-128" caption="LOC_OPTIONS_MODDING_ENABLE_ALL" tabindex="-1"></fxs-button>
							<fxs-button class="mods-disable-user ml-4 flex-auto max-w-128" caption="LOC_OPTIONS_MODDING_DISABLE_USER" tabindex="-1"></fxs-button>
						</fxs-hslot>
					</fxs-vslot>
					<fxs-vslot class="w-1\\/4">
						<fxs-scrollable class="bz-mod-list-scrollable flex-auto relative -right-1" handle-gamepad-pan="true" attached-scrollbar="true">
							<fxs-vslot class="bz-mod-list flex mx-1"></fxs-vslot>
						</fxs-scrollable>
					</fxs-vslot>
				</fxs-hslot>
			</fxs-slot>
			<div class="filigree-divider-inner-frame white-filigree-divider mt-4" data-bind-class-toggle="hidden:{{g_NavTray.isTrayRequired}}||true"></div>
		`;
  }
  renderModListContent() {
    this.bzRenderModListContent(true);
    this.bzRenderModListContent(false);
  }
  bzRenderModListContent(official) {
    const fxsList = MustGetElement(".mod-list", this.Root);
    const baseIndex = official ? 0 : fxsList.querySelectorAll(".mod-entry").length;
    const modList = official ? fxsList : MustGetElement(".bz-mod-list", this.Root);
    const modsContent = MustGetElement(".mods-available", this.Root);
    const modsContentEmpty = MustGetElement(".no-mods-available", this.Root);
    while (modList.lastChild) {
      modList.lastChild.removeEventListener("action-activate", this.onModActivateListener);
      modList.lastChild.removeEventListener("focus", this.onModFocusListener);
      modList.removeChild(modList.lastChild);
    }
    let installedMods = Modding.getInstalledMods();
    const modIdsToIgnore = Modding.getModulesToExclude();
    installedMods = installedMods.filter((m) => !modIdsToIgnore.includes(m.id));
    if (!this.showNotOwnedContent) {
      installedMods = installedMods.filter((m) => !m.official || m.allowance == ModAllowance.Full);
    }
    installedMods = installedMods.filter((m) => {
      if (m.official == true) {
        const showInBrowser = Modding.getModProperty(m.handle, "ShowInBrowser");
        return showInBrowser != "0";
      } else {
        return true;
      }
    });
    installedMods.sort((a, b) => Locale.compare(a.name, b.name));
    const toggleEnableButton = MustGetElement(".toggle-enable", this.Root);
    toggleEnableButton.addEventListener("action-activate", this.modToggledActivateListener);
    if (this.selectedModHandle != null) {
      if (installedMods.findIndex((m) => m.handle == this.selectedModHandle) == -1) {
        this.selectedModHandle = null;
      }
    }
    // blank the screen if there are no mods to show
    modsContent.classList.toggle("hidden", installedMods.length == 0);
    modsContentEmpty.classList.toggle("hidden", installedMods.length > 0);
    // only show the requested (un)official half of the list
    installedMods = installedMods.filter((m) => m.official == official);
    if (!installedMods.length) return;
    if (this.selectedModHandle == null) {
      this.selectedModHandle = installedMods[0].handle;
      this.selectedMod = installedMods[0];
    }
    installedMods.forEach((mod, index) => {
      const globalIndex = baseIndex + index;
      const modentry = document.createElement("fxs-activatable");
      modentry.classList.add("mod-entry");
      modentry.classList.add(index % 2 === 0 ? "bz-even-row" : "bz-odd-row");
      modentry.style.display = "flex";
      modentry.style.alignItems = "center";
      modList.appendChild(modentry);
      modentry.setAttribute("mod-handle", mod.handle.toString());
      modentry.setAttribute("tabindex", "-1");
      modentry.setAttribute("index", `${globalIndex}`);
      modentry.setAttribute("mod-handle", mod.handle.toString());
      modentry.addEventListener("action-activate", this.onModActivateListener);
      modentry.addEventListener("focus", this.onModFocusListener);
      if (this.selectedModHandle == mod.handle) {
        this.selectedMod = mod;
        FocusManager.setFocus(modentry);
      }
      const checkbox = document.createElement("fxs-checkbox");
      checkbox.className = "mod-checkbox-enabled scale-90 origin-center ml-0\\.5";
      if (mod.enabled) checkbox.setAttribute("selected", "true");
      const handle = mod.handle;
      checkbox.addEventListener("action-activate", () => {
        const mod2 = Modding.getModInfo(handle);
        if (!mod2) return;
        this.handleSpecificModToggle(mod2.enabled, handle, globalIndex);
      });
      const modTextContainer = document.createElement("div");
      modTextContainer.classList.add(
        "mod-text-container",
        "relative",
        "flex",
        "justify-start",
        "items-center",
        "pointer-events-none",
        "w-full",
        "shrink",
        "leading-normal",
        "p-1",
        "truncate",
      );
      const modIcon = document.createElement("div");
      modIcon.className = "size-6 mr-2 bg-contain bg-center bg-no-repeat";
      const shadow = "drop-shadow(0 0.0555555556rem 0.1111111111rem black)";
      switch (mod.subscriptionType) {
        case "OfficialContent":
          modIcon.style.backgroundImage = UI.getIconCSS("mod-firaxis");
          modIcon.style.filter = shadow;
          break;
        case "SteamWorkshopContent":
          modIcon.style.backgroundImage = UI.getIconCSS("mod-workshop");
          modIcon.style.filter =
            `fxs-color-tint(#ccf) brightness(1.25) contrast(2) ${shadow}`;
          break;
        case "CommunityContent":
        default:
          modIcon.style.backgroundImage = UI.getIconCSS("mod");
          modIcon.style.filter = shadow;
      }
      modTextContainer.appendChild(modIcon);
      const modName = document.createElement("div");
      modName.classList.add("mod-text-name", "relative", "flex", "grow", "shrink", "text-sm");
      modName.innerHTML = Locale.stylize(mod.name);
      modTextContainer.appendChild(modName);
      modentry.appendChild(modTextContainer);
      modentry.appendChild(checkbox);
    });
  }
  onAttach() {
    super.onAttach();
    this.Root.addEventListener("focus", this.focusListener);
    this.Root.addEventListener("engine-input", this.engineInputListener);
    this.modsEnableAll?.addEventListener("action-activate", this.modsEnableAllListener);
    this.modsDisableUser?.addEventListener("action-activate", this.modsDisableUserListener);
    this.updateDetails();
    if (this.refreshInterval == 0) {
      this.refreshInterval = setInterval(() => {
        const installedMods = Modding.getInstalledModHandles();
        if (!compareInstalledMods(this.installedModHandles, installedMods)) {
          this.installedModHandles = installedMods;
          this.renderModListContent();
        }
      }, 500);
    }
  }
  onDetach() {
    super.onDetach();
    this.Root.removeEventListener("focus", this.focusListener);
    this.Root.removeEventListener("engine-input", this.engineInputListener);
    this.modsEnableAll?.removeEventListener("action-activate", this.modsEnableAllListener);
    this.modsDisableUser?.removeEventListener("action-activate", this.modsDisableUserListener);
    if (this.refreshInterval != 0) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = 0;
    }
  }
  onAttributeChanged(name, oldValue, newValue) {
    super.onAttributeChanged(name, oldValue, newValue);
    switch (name) {
      case "show-not-owned-content":
        if (newValue) {
          this.showNotOwnedContent = newValue.toLowerCase() === "true";
          this.updateModListContent();
        }
        break;
    }
  }
  updateModListContent() {
    this.renderModListContent();
    this.modEntries = this.Root.querySelectorAll(".mod-entry");
  }
  updateDetails() {
    if (this.selectedModHandle == null || this.selectedMod == null) {
      console.error("screen-extras: showModDetails: Invalid selected mod handle!");
      return;
    }
    const mod = this.selectedMod;
    this.modNameHeader.setAttribute("title", mod.name);
    const authorElement = this.Root.querySelector(".mod-author");
    if (authorElement) {
      if (!mod.official) {
        const author = Modding.getModProperty(mod.handle, "Authors");
        if (author) {
          authorElement.textContent = Locale.compose("LOC_UI_MOD_AUTHOR", author);
        } else {
          authorElement.textContent = "";
        }
      } else {
        authorElement.textContent = "";
      }
    }
    if (mod.created) {
      this.modDateText.textContent = Locale.compose("LOC_UI_MOD_DATE", mod.created);
    }
    const affectsSave = Modding.getModProperty(mod.handle, "AffectsSavedGames");
    this.bzModAffectsSavedGame.textContent =
      Locale.compose("LOC_UI_AFFECTS_SAVE") + " " +
      Locale.compose(affectsSave === "0" ? "LOC_GENERIC_NO" : "LOC_GENERIC_YES");
    this.modDescriptionText.setAttribute("data-l10n-id", mod.description);
    if (mod.dependsOn) {
      this.modDependenciesContent.classList.remove("hidden");
      mod.dependsOn.forEach((dependecy) => {
        const dependencyEntry = document.createElement("div");
        dependencyEntry.classList.add("mod-dependency", "relative");
        dependencyEntry.setAttribute("data-l10n-id", dependecy);
        this.modDependenciesContent.appendChild(dependencyEntry);
      });
    }
    this.determineEnableButtonState();
  }
  determineEnableButtonState() {
    if (this.selectedModHandle == null || this.selectedMod == null) {
      return;
    }
    const toggleEnableButton = MustGetElement(".toggle-enable", this.Root);
    const modHandles = [this.selectedModHandle];
    let allowed = false;
    if (this.selectedMod.enabled) {
      const canDisableModResult = Modding.canDisableMods(modHandles);
      allowed = canDisableModResult.status == 0;
    } else {
      const canEnableModResult = Modding.canEnableMods(modHandles, true);
      allowed = canEnableModResult.status == 0;
    }
    this.disableToggling = !allowed;
    toggleEnableButton.setAttribute("disabled", allowed ? "false" : "true");
    toggleEnableButton.setAttribute(
      "caption",
      this.selectedMod.enabled ? "LOC_ADVANCED_OPTIONS_DISABLE" : "LOC_ADVANCED_OPTIONS_ENABLE"
    );
  }
  onModToggled(event) {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    const attrDisabled = event.target.getAttribute("disabled");
    if (attrDisabled != "true") {
      this.handleModToggle();
    }
  }
  handleSpecificModToggle(enabled, modhandle, modindex) {
    if (this.disableToggling) {
      return;
    }
    const modHandles = [modhandle];
    if (enabled) {
      Modding.disableMods(modHandles);
    } else {
      Modding.enableMods(modHandles, true);
    }
    this.disableToggling = true;
    const toggleEnableButton = MustGetElement(".toggle-enable", this.Root);
    toggleEnableButton.setAttribute("disabled", "true");
    this.handleSelection(modhandle, modindex);
    this.updateModEntry(modindex);
    this.updateNavTray();
  }
  handleModToggle() {
    if (this.selectedModHandle == null || this.selectedMod == null) {
      return;
    }
    const enabled = this.selectedMod.enabled;
    this.handleSpecificModToggle(enabled, this.selectedModHandle, this.selectedModIndex);
  }
  onModsEnableAll(event) {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    const attrDisabled = event.target.getAttribute("disabled");
    if (attrDisabled != "true") {
      this.handleModsEnableAll();
    }
  }
  handleModsEnableAll() {
    Modding.applyModsTemplate("enable-all");
    this.updateModListContent();
    this.updateDetails();
    this.updateNavTray();
  }
  onModsDisableUser(event) {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    const attrDisabled = event.target.getAttribute("disabled");
    if (attrDisabled != "true") {
      this.handleModsDisableUser();
    }
  }
  handleModsDisableUser() {
    Modding.applyModsTemplate("disable-user");
    this.updateModListContent();
    this.updateDetails();
    this.updateNavTray();
  }
  updateNavTray() {
    NavTray.addOrUpdateGenericBack();
    if (this.selectedModHandle == null || this.selectedMod == null) {
      return;
    }
    const enabled = this.selectedMod.enabled;
    const modHandles = [this.selectedModHandle];
    if (enabled && Modding.canDisableMods(modHandles).status == 0) {
      NavTray.addOrUpdateAccept("LOC_ADVANCED_OPTIONS_DISABLE");
    } else if (!enabled && Modding.canEnableMods(modHandles, true).status == 0) {
      NavTray.addOrUpdateAccept("LOC_ADVANCED_OPTIONS_ENABLE");
    }
    NavTray.addOrUpdateShellAction1("LOC_OPTIONS_MODDING_ENABLE_ALL");
    if (Modding.userModSupportAvailable()) {
      NavTray.addOrUpdateShellAction2("LOC_OPTIONS_MODDING_DISABLE_USER");
    }
  }
  onFocus() {
    this.resolveFocus();
    this.updateNavTray();
  }
  onEngineInput(inputEvent) {
    if (this.handleEngineInput(inputEvent)) {
      inputEvent.stopPropagation();
      inputEvent.preventDefault();
    }
  }
  handleEngineInput(inputEvent) {
    if (inputEvent.detail.status != InputActionStatuses.FINISH) {
      return false;
    }
    switch (inputEvent.detail.name) {
      case "shell-action-1":
        this.handleModsEnableAll();
        Audio.playSound("data-audio-primary-button-press");
        return true;
      case "shell-action-2":
        this.handleModsDisableUser();
        Audio.playSound("data-audio-primary-button-press");
        return true;
    }
    return false;
  }
  resolveFocus() {
    FocusManager.setFocus(this.mainSlot);
  }
  onModActivate(event) {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    if (ActionHandler.isGamepadActive) {
      Audio.playSound("data-audio-primary-button-press");
      this.handleModToggle();
    } else {
      this.handleSelection(
        parseInt(event.target.getAttribute("mod-handle") ?? ""),
        parseInt(event.target.getAttribute("index") ?? "0")
      );
    }
  }
  onModFocus(event) {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    this.handleSelection(
      parseInt(event.target.getAttribute("mod-handle") ?? ""),
      parseInt(event.target.getAttribute("index") ?? "0")
    );
    this.updateNavTray();
  }
  handleSelection(modHandle, index) {
    this.selectedModIndex = index;
    this.selectedMod = Modding.getModInfo(modHandle);
    this.selectedModHandle = modHandle;
    this.updateDetails();
  }
  updateModEntry(index) {
    const modEntry = this.modEntries.item(index);
    if (!modEntry) return;
    const modHandleString = modEntry.getAttribute("mod-handle");
    if (!modHandleString) return;
    if (this.selectedModHandle == null) return;
    const modInfo = Modding.getModInfo(this.selectedModHandle);
    const enabledCheckbox = modEntry.querySelector(".mod-checkbox-enabled");
    if (enabledCheckbox) {
      enabledCheckbox.setAttribute("selected", modInfo.enabled ? "true" : "false");
    }
  }
}
Controls.define("mods-content", {
  createInstance: ModsContent,
  classNames: ["mods-content"],
  attributes: [
    {
      name: "show-not-owned-content",
      description: "should we show the not owned content (default: false)"
    }
  ],
  tabIndex: -1
});

export { ModsContent };
//# sourceMappingURL=mods-content.js.map
