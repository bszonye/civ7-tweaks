// eslint.config.js
import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        rules: {
            "no-unused-vars": [
                "warn",
                {
                    "varsIgnorePattern": "^_",
                    "argsIgnorePattern": "^_",
                }
            ]
        },
        languageOptions: {
            globals: {
                Camera: "readonly",
                Cities: "readonly",
                CombatTypes: "readonly",
                Configuration: "readonly",
                Constructibles: "readonly",
                Controls: "readonly",
                CustomEvent: "readonly",
                Database: "readonly",
                DiplomacyActionGroups: "readonly",
                DiplomacyActionTypes: "readonly",
                DiplomacyActionTargetTypes: "readonly",
                DiplomacyPlayerRelationships: "readonly",
                DistrictTypes: "readonly",
                Districts: "readonly",
                Game: "readonly",
                GameContext: "readonly",
                GameInfo: "readonly",
                GameplayMap: "readonly",
                GlobalScaling: "readonly",
                GrowthTypes: "readonly",
                HTMLElement: "readonly",
                IndependentRelationship: "readonly",
                Input: "readonly",
                InputActionStatuses: "readonly",
                InputContext: "readonly",
                InputDeviceType: "readonly",
                LiteEvent: "readonly",
                Loading: "readonly",
                Locale: "readonly",
                MapCities: "readonly",
                MapConstructibles: "readonly",
                MapPlotEffects: "readonly",
                MapUnits: "readonly",
                PlayerIds: "readonly",
                Players: "readonly",
                ResourceTypes: "readonly",
                RevealedStates: "readonly",
                RiverTypes: "readonly",
                SpriteMode: "readonly",
                UI: "readonly",
                UIHTMLCursorTypes: "readonly",
                UIViewExperience: "readonly",
                Units: "readonly",
                Visibility: "readonly",
                WorldUI: "readonly",
                YieldTypes: "readonly",
                console: "readonly",
                delayByFrame: "readonly",
                document: "readonly",
                engine: "readonly",
                localStorage: "readonly",
                performance: "readonly",
                requestAnimationFrame: "readonly",
                setTimeout: "readonly",
                waitForLayout: "readonly",
                waitUntilValue: "readonly",
                window: "readonly",
            }
        }

    }
];
