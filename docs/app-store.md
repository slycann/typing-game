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

Seven worlds, a grumpy raincloud who needs cheering up, and dozens of Letterlings to rescue. Real typing on a real keyboard, one happy key at a time.

## Description (4000)

Letterlings turns learning to type into a story-filled adventure for children aged 5 to 10.

Grumble the Raincloud sneezed so hard that the Letterlings, the little creatures who live inside every key, blew all over Keyboard Valley. Your child becomes the new Key Keeper, travelling through seven colourful worlds to bring them home, and cheering up Grumble along the way.

MADE FOR A REAL KEYBOARD
Letterlings teaches proper keyboard skills, not tapping on glass. Every key you press is mirrored on the screen, the next key glows, and the Finger Friends show which finger to use. Connect any keyboard to your iPad, or play on a Mac.

BUILT ON HOW CHILDREN LEARN TO TYPE
• Starts on the home row with F and J, then adds keys in pairs
• Accuracy first, speed later; younger children get gentler goals
• Short, frequent sessions with a daily "Today's Adventure"
• Hints fade as each key is mastered, so children learn by feel
• Practice Garden builds drills from your child's weakest keys

SEVEN WORLDS TO EXPLORE
Home Row Meadow, Treetop Village, Sandy Bottom Beach, Shifty Mountains (capitals with Shift), Rocket Ridge (numbers), Symbol Sea (symbols) and Option Observatory (accents like é and ñ).

LOTS TO PLAY, AGAIN AND AGAIN
• Eight mini-games: Key Hop, Bubble Pop, Fruit Catch, Word Train, Bake Shop, Story Pages, Finger Fitness and Grumble's Rainy Day
• Rocket Races with brand-new passages every time, and a high-score board for initials
• Power-ups, coins, stars, badges and ranks
• A shop full of hats, glasses and pets, and a treehouse to decorate
• A sticker book of every Letterling rescued

EVERYTHING READ ALOUD
Characters speak every instruction, so children who are still learning to read can play on their own.

FOR GROWN-UPS
A Parent Zone (behind a grown-ups-only question) shows each child's progress and the keys to practise next, sets a daily time limit, adjusts sound and accessibility options, and saves backups. Up to six players per device.

NO ADS. NO IN-APP PURCHASES. NO DATA COLLECTED.
Progress stays on your device. Nothing is tracked or shared.

## Keywords (100)

typing,keyboard,learn to type,touch typing,kids,home row,spelling,letters,abc,school,practice,game

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
