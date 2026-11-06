# Letterlings: App Store listing and submission checklist

Everything App Store Connect asks for, ready to paste. Character limits are noted where Apple has them.

## App record

| Field | Value |
|---|---|
| Name (30) | Letterlings: Typing Adventure |
| Subtitle (30) | Learn to type with real keys |
| Bundle ID | com.slycann.letterlings |
| SKU | letterlings-1 |
| Primary language | English (U.S.) |
| Platforms | iPadOS app, also offered on Apple-silicon Macs ("Designed for iPad") |
| Primary category | Education |
| Secondary category | Games (Educational) |
| Kids Category | Yes, age band **6–8** (the game's sweet spot; it suits 5–10) |
| Age rating | 4+ (answer "None" to every content question) |
| Price | $0.99 (USD), one-time purchase; needs the Paid Apps Agreement, banking and tax info in App Store Connect |
| Privacy policy URL | https://slycann.github.io/typing-game/privacy.html |
| Support URL | https://slycann.github.io/typing-game/support.html |
| Marketing URL | https://slycann.github.io/typing-game/ |
| Copyright | 2026 Sylvester Cann |

## Promotional text (170)

Rescue 95 Letterlings across seven worlds and cheer up Grumble the Raincloud. Real typing on a real keyboard, one happy key at a time. No ads, no in-app purchases.

## Description (4000)

Letterlings teaches children aged 5 to 10 to type on a real keyboard, one happy key at a time. Seven worlds, eight mini-games and 95 little Letterlings to rescue turn typing practice into an adventure.

Letterlings needs a hardware keyboard. Connect any keyboard to your iPad, or play on a Mac with Apple silicon.

THE STORY
Grumble the Raincloud sneezed so hard that the Letterlings, the little creatures who live inside every key, blew all over Keyboard Valley. Your child becomes the new Key Keeper, traveling through seven colorful worlds to bring them home and cheering Grumble up along the way.

HOW IT TEACHES
• Starts on the home row with F and J, then adds the other letters two at a time
• The next key glows on screen, and the Finger Friends show which finger to use
• Accuracy first, speed later, with gentler goals for younger children
• Hints fade as each key is learned, so children learn to type by feel
• The Practice Garden builds drills from your child's trickiest keys
• Today's Adventure suggests three short activities for a good ten-minute session

SEVEN WORLDS
Home Row Meadow, Treetop Village, Sandy Bottom Beach, Shifty Mountains (capital letters with Shift), Rocket Ridge (numbers), Symbol Sea (punctuation and symbols) and Option Observatory (letters like é and ñ, made with the Option key).

LOTS TO PLAY
• Eight mini-games: Finger Fitness, Key Hop, Bubble Pop, Fruit Catch, Word Train, Bake Shop, Story Pages and Grumble's Rainy Day
• Rocket Races with fresh, silly sentences every time, and a high-score board for your initials
• Coins, stars, power-ups, badges and ranks to earn
• A shop full of hats, glasses and pets, and a treehouse to decorate
• A sticker book of every Letterling you've rescued

EVERYTHING READ ALOUD
Characters speak every instruction, so children who are still learning to read can play on their own.

FOR GROWN-UPS
The Parent Zone sits behind a grown-ups-only question. It shows each child's progress and the keys to practice next, and lets you set a daily play limit, adjust sound and music, turn on easy-read text or reduced motion, and save a backup of everyone's progress. Up to six players can share one device.

NO ADS. NO IN-APP PURCHASES. NO DATA COLLECTED.
There are no accounts, and nothing is tracked or shared. Progress stays on your device.

## Keywords (100)

touch,keyboard,keyboarding,home,row,letters,alphabet,abc,spelling,children,school,homeschool,fingers

The name and subtitle are searched too, so no word from them is repeated here (Apple combines words across the three, e.g. "touch" + "Typing").

## What's New (first version)

Welcome to Letterlings! Seven worlds, eight mini-games and a whole valley of Letterlings to rescue.

## App Privacy ("nutrition label")

- Data collection: **Data Not Collected**
- Tracking: **No**

## App Review notes

> Letterlings is a typing game and needs a hardware keyboard. On iPad, please attach a keyboard; on Mac, use the built-in keyboard. If Play is tapped with no keyboard connected, the app explains that one is needed.
>
> No account or login. No in-app purchases, ads, analytics or external links.
>
> Parental gate: on the "Who's playing?" screen, the "Grown-ups" button asks a times-table question (for example 7 × 8) before showing the Parent Zone (progress, settings, player reset/delete, backup). Type the answer and press Return.
>
> To move through levels quickly, play the first level (Finger Fitness): press the key shown in the bubble.

## Export compliance

The app uses no non-exempt encryption. `ITSAppUsesNonExemptEncryption` is set to NO in Info.plist, so App Store Connect won't ask.

## Screenshots

iPad 13-inch: 2752 × 2064 (landscape). The same set is used for the Mac listing. Generate them with:

```bash
npm run screenshots
```

They're written to `docs/screenshots/`.

## Checklist

1. Install Xcode on the Mac mini, add the iOS platform, sign in under Xcode → Settings → Accounts.
2. Register the bundle ID `com.slycann.letterlings` (Xcode does this automatically with "Automatically manage signing").
3. Create the app in App Store Connect (Apps → + → New App) with the fields above. Because the app is paid, accept the Paid Apps Agreement and add banking and tax info under Business.
4. Build and upload from Xcode (Product → Archive → Distribute App → App Store Connect).
5. Test on an iPad with a keyboard (and on a Mac) through TestFlight.
6. Fill in the listing, privacy, age rating, Kids Category and screenshots; submit for review.
