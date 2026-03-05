import { D as DiploRibbonData } from '/base-standard/ui/diplo-ribbon/model-diplo-ribbon.chunk.js';
import '/base-standard/ui/diplo-ribbon/panel-diplo-ribbon.js';

const DRD_createPlayerYieldsData = DiploRibbonData.createPlayerYieldsData;
DiploRibbonData.createPlayerYieldsData = function(player, isLocal) {
    const round = (y) =>
        Locale.compose(
            "LOC_BZ_GROUPED_MODIFIER",
            y < 100 ? Math.trunc(y * 10) / 10 : Math.trunc(y)
        );
    // count combat strength (best of melee, ranged, bombard)
    const combat = (unit) => {
        if (!unit.Combat?.canAttack) return 0;
        return Math.max(
            unit.Combat.getMeleeStrength(false),
            unit.Combat.rangedStrength,
            unit.Combat.bombardStrength,
        );
    }
    const yieldCombat = player.Units.getUnits()
        .map(unit => combat(unit)).reduce((a, c) => a + c, 0);
    // count food (in growing settlements only)
    const cities = player.Cities.getCities();
    const yieldFood = cities.filter(city => city.Growth.growthType == GrowthTypes.EXPAND)
        .map(city => city.Yields.getNetYield(YieldTypes.YIELD_FOOD))
        .reduce((a, c) => a + c, 0) ?? 0;
    // count production (in cities only)
    const yieldProduction = cities.filter(city => !city.isTown)
        .map(city => city.Yields.getNetYield(YieldTypes.YIELD_PRODUCTION))
        .reduce((a, c) => a + c, 0) ?? 0;
    // adjust vanilla format
    const ydata = DRD_createPlayerYieldsData.call(this, player, isLocal);
    for (const y of ydata) {
        if (y.value.match(/^[-+]\d+$/)) y.value = round(y.rawValue);
    }
    return [
        {
            type: "combat",
            label: Locale.compose("LOC_BZ_YIELD_COMBAT_STRENGTH"),
            value: Locale.compose("LOC_BZ_GROUPED_DIGITS", yieldCombat),
            img: this.getImg("NAR_REW_COMBAT", isLocal),
            details: "",
            rawValue: yieldCombat,
            warningThreshold: Infinity
        },
        {
            type: "food",
            label: Locale.compose("LOC_YIELD_FOOD"),
            value: round(yieldFood),
            img: this.getImg("YIELD_FOOD", isLocal),
            details: "",
            rawValue: yieldFood,
            warningThreshold: Infinity
        },
        {
            type: "production",
            label: Locale.compose("LOC_YIELD_PRODUCTION"),
            value: round(yieldProduction),
            img: this.getImg("YIELD_PRODUCTION", isLocal),
            details: "",
            rawValue: yieldProduction,
            warningThreshold: Infinity
        },
        ...ydata,
    ];
}
// refresh model with patched version
engine.whenReady.then(() => DiploRibbonData.updateAll());

class bzPanelDiploRibbon {
    static c_prototype;
    constructor(component) {
        this.component = component;
        this.component.bzComponent = this;
        this.patchPrototypes(this.component);
    }
    patchPrototypes(component) {
        const c_prototype = Object.getPrototypeOf(component);
        if (bzPanelDiploRibbon.c_prototype == c_prototype) return;
        // patch PanelCityDetails methods
        const proto = bzPanelDiploRibbon.c_prototype = c_prototype;
        // wrap render method to extend it
        const c_populateFlags = proto.populateFlags;
        const after_populateFlags = this.afterPopulateFlags;
        proto.populateFlags = function(...args) {
            const c_rv = c_populateFlags.apply(this, args);
            const after_rv = after_populateFlags.apply(this.bzComponent, args);
            return after_rv ?? c_rv;
        }
    }
    beforeAttach() { }
    afterAttach() { }
    afterPopulateFlags() {
        const flags = this.component.Root.querySelectorAll(".diplo-ribbon-outer");
        for (const flag of flags) {
            for (const item of flag.querySelectorAll(".yield-item")) {
                item.classList.replace("font-title-base", "font-body-sm");
            }
            for (const value of flag.querySelectorAll(".yield-value")) {
                value.classList.add("ml-1");
                if (value.getAttribute("data-l10n-id").startsWith("-")) {
                    value.classList.add("text-negative");
                }
            }
        }
    }
    beforeDetach() { }
    afterDetach() { }
}
Controls.decorate("panel-diplo-ribbon", (c) => new bzPanelDiploRibbon(c));
