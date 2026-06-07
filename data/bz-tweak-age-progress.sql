-- no milestone progress
-- UPDATE AgeProgressionEvents SET Points=0 WHERE AgeProgressionEventType="AGE_PROGRESSION_PLAYER_MILESTONE_1";
-- UPDATE AgeProgressionEvents SET Points=0 WHERE AgeProgressionEventType="AGE_PROGRESSION_PLAYER_MILESTONE_2";
-- UPDATE AgeProgressionEvents SET Points=0 WHERE AgeProgressionEventType="AGE_PROGRESSION_PLAYER_MILESTONE_3";

-- no player elimination progress
-- UPDATE AgeProgressionEvents SET Points=0 WHERE AgeProgressionEventType="AGE_PROGRESSION_PLAYER_ELIMINATED";
-- UPDATE AgeProgressionEventMapSizeOverrides SET Points=0 WHERE AgeProgressionEventType="AGE_PROGRESSION_PLAYER_ELIMINATED";

-- adjust age lengths
-- UPDATE AgeProgressions SET MaxPoints_Abbreviated=120, MaxPoints_Standard=150, MaxPoints_Long=180 WHERE AgeProgressionType="AGE_PROGRESSION_ANTIQUITY_AGE_TIMER";
-- UPDATE AgeProgressions SET MaxPoints_Abbreviated=90, MaxPoints_Standard=120, MaxPoints_Long=150 WHERE AgeProgressionType="AGE_PROGRESSION_EXPLORATION_AGE_TIMER";
-- UPDATE AgeProgressions SET MaxPoints_Abbreviated=90, MaxPoints_Standard=120, MaxPoints_Long=150 WHERE AgeProgressionType="AGE_PROGRESSION_MODERN_AGE_TIMER";

-- are these important?

-- UPDATE GlobalParameters SET Value=120 WHERE Name="GAME_AGE_LENGTH_ABBREVIATED" AND EXISTS (SELECT Age FROM AgeGrowthBalances WHERE Age="AGE_ANTIQUITY");
-- UPDATE GlobalParameters SET Value=90 WHERE Name="GAME_AGE_LENGTH_ABBREVIATED" AND EXISTS (SELECT Age FROM AgeGrowthBalances WHERE Age="AGE_EXPLORATION");
-- UPDATE GlobalParameters SET Value=90 WHERE Name="GAME_AGE_LENGTH_ABBREVIATED" AND EXISTS (SELECT Age FROM AgeGrowthBalances WHERE Age="AGE_MODERN");

-- UPDATE GlobalParameters SET Value=150 WHERE Name="GAME_AGE_LENGTH_STANDARD" AND EXISTS (SELECT Age FROM AgeGrowthBalances WHERE Age="AGE_ANTIQUITY");
-- UPDATE GlobalParameters SET Value=120 WHERE Name="GAME_AGE_LENGTH_STANDARD" AND EXISTS (SELECT Age FROM AgeGrowthBalances WHERE Age="AGE_EXPLORATION");
-- UPDATE GlobalParameters SET Value=120 WHERE Name="GAME_AGE_LENGTH_STANDARD" AND EXISTS (SELECT Age FROM AgeGrowthBalances WHERE Age="AGE_MODERN");

-- UPDATE GlobalParameters SET Value=180 WHERE Name="GAME_AGE_LENGTH_LONG" AND EXISTS (SELECT Age FROM AgeGrowthBalances WHERE Age="AGE_ANTIQUITY");
-- UPDATE GlobalParameters SET Value=150 WHERE Name="GAME_AGE_LENGTH_LONG" AND EXISTS (SELECT Age FROM AgeGrowthBalances WHERE Age="AGE_EXPLORATION");
-- UPDATE GlobalParameters SET Value=150 WHERE Name="GAME_AGE_LENGTH_LONG" AND EXISTS (SELECT Age FROM AgeGrowthBalances WHERE Age="AGE_MODERN");
