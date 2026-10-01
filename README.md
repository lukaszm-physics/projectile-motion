# Interaktiv illustration av kaströrelse

Det här projektet ska bli en interaktiv fysikillustration av kaströrelse. Användaren ska kunna ändra kastets förutsättningar och se hur de påverkar föremålets bana, flygtid och räckvidd.

## Status

Projektet är under uppbyggnad. Den här README-filen beskriver den planerade illustrationen. Ingen körbar implementation finns ännu; instruktioner för installation och start läggs till när teknikval och kod finns på plats.

## Syfte

Illustrationen ska hjälpa elever att undersöka sambandet mellan hastighet, vinkel och rörelse i ett gravitationsfält. Den ska synliggöra hur en horisontell rörelse med konstant hastighet och en vertikal rörelse med konstant acceleration tillsammans bildar en parabel.

## Planerade funktioner

- Justera starthastighet, kastvinkel, starthöjd och tyngdacceleration.
- Visa kastbanan i ett koordinatsystem med avstånd i meter.
- Starta, pausa och återställa animationen.
- Visa förfluten tid, aktuell position och hastighet.
- Visa flygtid, maximal höjd och horisontell räckvidd.
- Visa hastighetens horisontella och vertikala komponenter.

## Fysikalisk modell

Den första versionen utgår från ett föremål som behandlas som en punktmassa, utan luftmotstånd. Tyngdaccelerationen är konstant och marken är plan vid höjden `y = 0`. Positiv x-riktning är åt höger och positiv y-riktning är uppåt. Kastvinkeln mäts från den positiva x-axeln.

Med startpositionen `(0, h₀)` beskrivs rörelsen av:

```text
x(t)  = v₀ · cos(θ) · t
y(t)  = h₀ + v₀ · sin(θ) · t − g · t² / 2

vₓ(t) = v₀ · cos(θ)
vᵧ(t) = v₀ · sin(θ) − g · t
```

| Storhet | Betydelse | Enhet |
| --- | --- | --- |
| `t` | Tid sedan kastet | s |
| `v₀` | Starthastighetens belopp | m/s |
| `θ` | Kastvinkel | grader i gränssnittet, radianer i beräkningarna |
| `h₀` | Starthöjd över marken | m |
| `g` | Tyngdaccelerationens belopp, normalt cirka 9,82 på jorden | m/s² |

Simuleringen ska avslutas när föremålet träffar marken efter kastet. Modellen beskriver idealiserad kaströrelse; verkliga föremåls banor kan påverkas av bland annat luftmotstånd och vind.

## Förslag på undersökningar

1. Håll starthastigheten konstant och variera kastvinkeln. Vilken vinkel ger längst räckvidd när start och landning sker på samma höjd?
2. Jämför kastvinklarna 30° och 60° från marknivå. Hur skiljer sig maximal höjd och flygtid, och hur förhåller sig räckvidderna till varandra?
3. Fördubbla starthastigheten. Hur förändras räckvidden vid samma vinkel och med start och landning på marknivå?
4. Ändra tyngdaccelerationen och jämför rörelsen vid samma startvillkor.
5. Öka starthöjden. Är 45° fortfarande den vinkel som ger längst räckvidd?

## Nästa steg

1. Välj teknik för gränssnitt, animation och visualisering.
2. Implementera modellen och reglagen för startvillkor.
3. Lägg till animation och visning av fysikaliska storheter.
4. Kontrollera beräkningarna mot analytiska resultat, till exempel `R = v₀² · sin(2θ) / g` för kast som startar och landar på marknivå.
5. Komplettera den här filen med instruktioner för att köra illustrationen.
