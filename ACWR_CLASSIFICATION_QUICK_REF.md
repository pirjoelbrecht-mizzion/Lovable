# ACWR Activity Classification - Quick Reference

**ONE-LINE PRINCIPLE:**
> ACWR is cardio-metabolic load over time — not total activity time.

## ✅ INCLUDED (Cardio/Aerobic)

**Cycling/Wheeled**
- Ride, VirtualRide, EBikeRide*, Handcycle, Velomobile, InlineSkate, Wheelchair

**Running/Walking**
- Run, VirtualRun, TrailRun, Walk, SpeedWalk, Hike

**Water Sports**
- Swim, OpenWaterSwim, Surfing*, Windsurf*, Kitesurf*
- StandUpPaddling, Kayaking, Canoeing, Rowing, RowingMachine

**Winter Sports**
- AlpineSki, BackcountrySki, NordicSki, Snowshoe

**Outdoor Endurance**
- Mountaineering, AdventureRace*, Orienteering

## ❌ EXCLUDED (Strength/Fitness)

- Workout, WeightTraining, Crossfit
- CircuitTraining, HighIntensityIntervalTraining
- Yoga, Pilates, StairStepper, Elliptical

**Why:** Localized fatigue, non-linear stress, distorts ACWR

## ❌ EXCLUDED (Skill/Technical)

**Climbing**
- RockClimbing, IceClimbing, ViaFerrata

**Team/Ball Sports**
- Soccer, Football, Basketball, Baseball, Softball, Rugby
- Hockey, IceHockey, Cricket, Lacrosse, Handball
- Volleyball, BeachVolleyball
- Tennis, TableTennis, Squash, Racquetball, Badminton, Pickleball

**Combat/Precision**
- Boxing, Kickboxing, MartialArts, Wrestling
- Fencing, Archery, Shooting

**Leisure**
- Golf, DiscGolf, Bowling, Dance, Equestrian
- Fishing, Hunting, Skateboard

**Why:** Intermittent/chaotic load, ACWR invalid

## Special Cases

**EBike*** - Include only if HR shows aerobic effort
**Surfing/Windsurf/Kitesurf*** - Include if paddle-dominant
**AdventureRace*** - Include only in endurance mode
**Elliptical/StairStepper** - Excluded by default

## Usage

```typescript
import { isACWREligible } from '@/lib/acwrActivityClassification';

isACWREligible('Run')            // → true
isACWREligible('WeightTraining') // → false
isACWREligible('Soccer')         // → false
```

## What This Means

**Athlete's Week:**
```
Mon: Run 60min → ACWR ✅
Tue: Strength 45min → ACWR ❌
Wed: Swim 30min → ACWR ✅
Thu: Rest
Fri: Run 45min → ACWR ✅
Sat: WeightTraining 45min → ACWR ❌
Sun: Long Run 120min → ACWR ✅
```

**ACWR Calculation:**
```
Total Time: 345 minutes (all activities)
ACWR Time:  255 minutes (cardio only)
Excluded:    90 minutes (strength not counted)
```

**Why It Matters:**
- Accurate injury risk prediction
- Fair for athletes who strength train
- Multi-sport ready
- Follows sports science standards
