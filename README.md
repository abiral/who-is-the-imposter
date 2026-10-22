# Who is the Imposter?

A light, mobile-first pass-and-play party word game. No build step, no dependencies.

**Play:** https://abiral.github.io/who-is-the-imposter/

## How it works

1. Enter the number of players (3 to 30).
2. Pass the phone around. Each player presses and holds the card to see the secret word.
3. One random player is the imposter. Instead of the word, they see **YOU ARE THE IMPOSTER** and a vague hint.
4. Once everyone has looked, the game picks a random starting player.
5. Go around saying one related word each, then vote on who the imposter is.

The imposter, the starting player and the word are all chosen with `crypto.getRandomValues` (unbiased). Words don't repeat on the same device until the whole list has been used.

## Editing the word list

All words live in [`words.json`](words.json):

```json
{
  "version": 1,
  "words": [
    { "word": "Pizza", "hint": "Italian", "category": "Food" }
  ]
}
```

- `word`: what regular players see.
- `hint`: what the imposter sees. Keep it vague so the imposter can blend in without it giving the word away.
- `category`: for organising the list only (not shown in game).

Add, remove or edit entries and push. GitHub Pages redeploys automatically.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Markup for the three screens |
| `style.css` | Styles (dark and light themes follow the device setting) |
| `app.js` | Game logic |
| `words.json` | Word list (1000 entries) |
| `sw.js` | Offline support (network-first cache) |
| `manifest.webmanifest` | "Add to Home Screen" support |

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```
