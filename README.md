# Voting Monkey Balls

**Voting Monkey Balls** is a spectator brawler where participants compete to amass the largest hoard of bananas by predicting and influencing volatile, physics-driven battles. Built for the "Three Thing Game" jam, the game utilises a live multiplayer architecture that allows a host to run a match while players join from their own devices to influence the chaos through offerings to the "Wise Monkey".

**Play Voting Monkey Balls:** [vmb.jaydchw.com/](https://vmb.jaydchw.com/)

## Player Objective

In this arena, bananas are the ultimate prize and the only currency recognised by the Wise Monkey, the arbiter who owns the space. He does not grant his favours for free; each round, players offer up their hard-earned bananas to vote on **Draw Event** cards, hoping their offering is significant enough to convince him to select their preferred outcome. 

Your goal is to have the largest banana hoard when the dust settles. To get there, you must balance your bets on the winning ball against the cost of trying to influence the Wise Monkey’s decisions, all while navigating a battle style where luck and environmental chaos are just as important as any weapon upgrade.

## Core Systems

* **Hosting a Lobby:** Click "Host Game" from the main menu. The game will generate a 4-character Room Code. You can adjust match settings (like starting bananas, timers, and bot counts) and then click "Start Match" when players are ready.
* **Joining a Lobby:** Click "Join Game" from the main menu. Enter the Room Code provided by the host and a Player Name, then click "Join Room". You will wait in the lobby until the host starts the match.

## Game Flow (Stages)

The game runs in a loop of specific phases during a match:

* **Prematch:** Players select their monkey character and place a "Main Wager" on which ball (Red or Blue) will win the round.
* **Running (In Progress):** The physics simulation begins, and the Red and Blue balls fight automatically.
* **Vote:** The match pauses. Players use their bananas to vote on one of three random event cards (which grant weapons or modifiers).
* **Reveal:** The voting results are shown, and the winning card's effects are applied to the game.
* **Wagers:** Players can place a quick wager on specific events that might happen in the next interval of gameplay. After this, the game goes back to the Running phase.
* **Round End / Settlement:** When a ball loses all its health or the timer runs out, the round ends, and main wagers are paid out.

## Game Mechanics

* **Volatile Physics Battles:** These are high-speed, unpredictable encounters where the environment and physics engine dictate the flow. Every minor collision or environmental shift can flip the momentum of the fight, meaning matches are never truly settled until the final hit.
* **The Wise Monkey’s Favour (Voting):** Between combat rounds, the game enters the **Draw Event** phase. Three random cards are presented, ranging from **Weapon** upgrades (like Katanas or Bazookas) to **Arena** changes (like Gravity or Vortices). Players spend bananas to increase their "Vote Power", attempting to sway the Wise Monkey's choice for the next round.
* **Wagers:** For those seeking extra bananas on the side, you can place **Wagers** on specific aspects of the chaos. You might guess which ball will hit the wall more often, which team will deal the most damage, or if total collisions will exceed a certain threshold.

### What is a Wager?

A wager is placed during the brief pauses in gameplay. Instead of wagering on who wins the whole round, you bet on specific events occurring before the next pause. The available wagers are:
* Red outdamages Blue
* Blue outdamages Red
* Red hits more walls
* Blue hits more walls
* 10+ total ball collisions

---

## Arsenal & Modifiers

### Ball Modifiers
These alter the stats or behaviour of a specific ball:
* **Armored:** Halves all damage and starts with a 20 HP shield.
* **Artillery Specialist:** Projectile damage is doubled, but melee damage is halved.
* **Baby:** Shrinks the ball to 60% size and increases speed, but it takes 30% more damage.
* **Berserker:** Speeds up as health drops.
* **Caustic Payload:** Attacks deal +50% damage, but all damage is delivered over 5 seconds.
* **Duelist Specialist:** Melee damage is doubled, but projectile damage is halved.
* **Growth Hormones:** Instantly grows the ball to 1.5x size and adds 3 damage to collisions.
* **Leech:** Heals 3 HP when colliding with the enemy ball.
* **Lucky Evade:** 25% chance to ignore incoming damage.
* **Magnetic:** Gradually pulls the enemy ball toward this one.
* **Mitosis:** Splits the ball into two linked copies that share a health pool.
* **Overcharge:** Zaps the enemy for 8 damage every 3 seconds.
* **Phase Shift:** On wall hits, has a 35% chance to blink to a random spot and briefly slow the enemy.
* **Projectile Deflector:** 50% chance to deflect incoming projectiles back.
* **Rapid Fire:** 35% faster attacks for all weapons.
* **Regen:** Regenerates 2 HP per second.
* **Snake:** Leaves a chain of ghost balls in its wake that block enemies and deal damage.
* **Spikes:** Deals extra damage on contact with the other ball.
* **Stunning Strikes:** All attacks have a 50% chance to stun the target for 1 second.
* **Twin Hearts:** Doubles max HP and immediately heals to full.

### Arena Modifiers
These alter the environment or rules of the entire match:
* **Bumpers:** Adds 5 indestructible bumper obstacles that deflect balls at high speed.
* **Circle Arena:** Transforms the rectangular arena into a circle.
* **Double Loadout:** Newly added weapons and ball modifiers are applied twice.
* **Double Time:** Simulation speed is doubled for balls, projectiles, cooldowns, and effects.
* **Gravity On:** Enables gravity for projectiles.
* **Portal:** Balls wrap through walls to the opposite side instead of bouncing.
* **Rogue Monkey:** Spawns a neutral monkey with 2 random weapons and 2 random ball modifiers.
* **Shrinking Zone:** A safe circle shrinks toward the centre, and balls outside take damage each second.
* **Speed Boost:** All balls move 60% faster.
* **Turbulence:** Random wind gusts periodically push all balls in a new direction.
* **2v2:** Both teams gain Growth Hormones and Mitosis.
* **Vortex:** A gravity vortex at the centre slowly pulls and spins all balls.

### Weapons
Weapons are equipped to a ball and deal damage:
* **Bazooka:** Launches explosive rockets that detonate on players or walls with splash damage.
* **Boomerang:** Throws a curved blade that swings back to the owner.
* **Eighth Note:** A flying note that hurls fast sonic pulses straight at the enemy.
* **Electric Staff:** Fires shocking bolts that stun the enemy ball for a full second.
* **Homing Gun:** Fires guided rounds that curve toward the enemy ball.
* **Katana:** A mirror-edged katana that slices in arcs and deflects projectiles.
* **Laser Gun:** Fires very wide, solid laser beams that burn through targets in pulses.
* **Machine Gun:** Sprays low-damage rounds that ricochet around the arena walls.
* **Poison Staff:** Launches toxic globes that slow the enemy and inflict poison over time.
* **Rapier:** A long dueling blade that carves elegant circles around the ball.
* **Scythe:** A sweeping reaper blade that steals life on every hit.
* **Shield:** A rotating shield that blocks melee and reflects incoming projectiles.
* **Shotgun:** Blasts three shells in a spread for close-range pressure.
* **Sniper:** A high-caliber rifle with a red sight line and devastating shots.
* **Staff:** A staff that spins around the ball and fires a shot every second.
* **Sword:** A simple sword that spins around the ball and deals contact damage.
* **Treble Clef:** A dramatic clef that locks onto the enemy and launches booming crescendos.
* **Wrench:** A heavy wrench that deploys auto-firing helper turrets while dealing contact damage.

---

## Developer Tools

The project was developed with a focus on responsive UI that synchronises with the music. To maintain balance across the variety of weapons and modifiers, the application includes a built-in suite of developer tools accessible from the main menu:

* **Card Gallery:** A visualiser for testing the UI, descriptions, and quality scores of every card in the **Weapon**, **Modifier**, and **Arena** catalogues.
* **Audio Test Bench:** A tool used to calibrate the dynamic music system, ensuring UI pulses accurately match the loop's specific timestamps.
* **Character Lab:** A sandbox for verifying the rendering of the custom monkey SVG avatars and their associated colour palettes.
* **Bot Simulation:** A mode for observing how automated agents interact with the betting markets and combat physics.

## Source Code & Deployment

As this is a live, browser-based multiplayer game, the source code is not included in the local download. You can play the game immediately using the link below:

* **Play Voting Monkey Balls:** [vmb.jaydchw.com/](https://vmb.jaydchw.com/)
* **GitHub Repository:** [https://github.com/Jaydchw/voting-monkey-balls](https://github.com/Jaydchw/voting-monkey-balls)
