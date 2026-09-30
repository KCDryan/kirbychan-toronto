# Photos

Drop a photo here with the right name and it replaces the placeholder on the next deploy. No code
changes. JPG, PNG or WebP. Upload the largest original you have (at least 1600px wide); the build
creates the small fast versions automatically.

| File | Where it shows |
| --- | --- |
| `home-hero-suit.jpg` | Homepage hero, portrait crop (4:5) in a framed card. Kirby standing in a dark suit |
| `about-team.jpg` | About page, full width, landscape crop (3:2). The team photo |
| `kirby-portrait.png` | /about/ and the guide sidebar, square crop (1:1). Kirby's headshot. Delete the old file if you add a replacement with a different extension |
| `kirby-office-casual.png` | Homepage Meet Kirby section, portrait crop (4:5). Kirby in a cream jacket in a bright office |
| `neighbourhoods/leaside.jpg` | Leaside page hero, grid card and social share image |
| `neighbourhoods/lawrence-park.jpg` | Lawrence Park |
| `neighbourhoods/yonge-eglinton.jpg` | Yonge and Eglinton |
| `neighbourhoods/don-mills.jpg` | Don Mills |
| `neighbourhoods/the-annex.jpg` | The Annex |
| `neighbourhoods/bayview-village.jpg` | Bayview Village |
| `neighbourhoods/willowdale.jpg` | Willowdale |
| `neighbourhoods/downtown-waterfront.jpg` | Downtown and the waterfront |
| `neighbourhoods/high-park.jpg` | High Park |
| `neighbourhoods/the-beaches.jpg` | The Beaches |
| `neighbourhoods/riverdale.jpg` | Riverdale |
| `neighbourhoods/islington-village.jpg` | Islington Village and Etobicoke City Centre |
| `places/markham.jpg` | Markham (credit slug `markham`) |
| `places/mississauga.jpg` | Mississauga (credit slug `mississauga`) |
| `places/vaughan.jpg` | Vaughan (credit slug `vaughan`) |
| `places/ttc-subway.jpg` | TTC subway and transit (credit slug `ttc-subway`) |

Names must match exactly, in lower case. Only use photos you own or have written permission to use.
Every photo in `neighbourhoods/` and `places/` needs an entry in `src/data/photo-credits.json`
with its author, licence and alt text (`shows`); files outside `neighbourhoods/` also need `file`.

## Sources

Kirby's own photos:

| File | Source |
| --- | --- |
| `kirby-portrait.png` | https://kirbychanandco.com/ (the headshot on that site) |
| `about-team.jpg` | https://kirbychanandco.com/ (the team photo on that site) |
| `home-hero-suit.jpg` | Cropped from the full-length suit portrait (2456 x 3680) on https://kirbychandigital.com/ . Only the crop is kept in the repo, because every image in this folder is copied into the build |
| `kirby-office-casual.png` | https://kirbychandigital.com/ |

Licensed photos from Wikimedia Commons (full credits in `src/data/photo-credits.json`):

| File | Source |
| --- | --- |
| `neighbourhoods/leaside.jpg` | https://commons.wikimedia.org/wiki/File:Homes_on_Rumsey_Road_in_Leaside,_Toronto,_August_30_2025.jpg |
| `neighbourhoods/lawrence-park.jpg` | https://commons.wikimedia.org/wiki/File:Lawrence_Park_South.jpg |
| `neighbourhoods/yonge-eglinton.jpg` | https://commons.wikimedia.org/wiki/File:Eglinton_Avenue_at_Yonge_Street_in_Toronto,_August_15_2026.jpg |
| `neighbourhoods/don-mills.jpg` | https://commons.wikimedia.org/wiki/File:Shops_at_Don_Mills_(37496329896).jpg |
| `neighbourhoods/the-annex.jpg` | https://commons.wikimedia.org/wiki/File:Madison_Avenue_in_Toronto,_July_29_2026_(02).jpg |
| `neighbourhoods/bayview-village.jpg` | https://commons.wikimedia.org/wiki/File:Condo_Towers_Bayview_Village.jpg |
| `neighbourhoods/willowdale.jpg` | https://commons.wikimedia.org/wiki/File:MelLastmanSquare_-_2015June03.jpg |
| `neighbourhoods/downtown-waterfront.jpg` | https://commons.wikimedia.org/wiki/File:Downtown_Toronto_in_September_2018_(Early_Sunday_Morning,_view_from_a_kayak).jpg |
| `neighbourhoods/high-park.jpg` | https://commons.wikimedia.org/wiki/File:Grenadier_Pond_in_High_park.jpg |
| `neighbourhoods/the-beaches.jpg` | https://commons.wikimedia.org/wiki/File:Queen_Street_East_in_The_Beaches,_July_16_2025_(01).jpg |
| `neighbourhoods/riverdale.jpg` | https://commons.wikimedia.org/wiki/File:504_King_TTC_Streetcar_on_Broadview,_July_23_2025_(04).jpg |
| `neighbourhoods/islington-village.jpg` | https://commons.wikimedia.org/wiki/File:Islington-City_Centre_West_new_high-rise_residential_2021.jpg |
| `places/markham.jpg` | https://commons.wikimedia.org/wiki/File:Main_Street_in_Unionville,_April_25_2026_(07).jpg |
| `places/mississauga.jpg` | https://commons.wikimedia.org/wiki/File:Mississauga_City_Centre,_September_13_2025.jpg |
| `places/vaughan.jpg` | https://commons.wikimedia.org/wiki/File:Vaughan_Metropolitan_Centre_station_exterior,_July_2018.jpg |
| `places/ttc-subway.jpg` | https://commons.wikimedia.org/wiki/File:Toronto_Rocket.JPG |
