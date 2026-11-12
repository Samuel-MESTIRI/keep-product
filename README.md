# KeepProduct — mes références produits (PWA)

Wishlist intelligente pour l'aménagement et la déco : on colle le lien d'un meuble, d'une lampe ou d'un pot de peinture, la fiche se remplit toute seule (photo, nom, prix, promo, dimensions, stock), puis on range les produits dans des listes (Salon, Cuisine, Chambre…). Pensée pour l'iPhone / Android, installée sur l'écran d'accueil.

**Stack** (identique à BAO) : Nuxt 4 (front + API Nitro) · PostgreSQL · Drizzle ORM · Zod · nuxt-auth-utils · Tailwind CSS 4 · @vite-pwa/nuxt · sharp

## Fonctionnalités

- **Ajout depuis un lien** : la page du produit est lue côté serveur et pré-remplit le formulaire, à vérifier avant d'enregistrer. Produit déjà enregistré signalé. Saisie manuelle toujours possible.
- **Fiche produit** : photo, nom, boutique, marque, prix, prix barré et remise, dimensions, disponibilité, couleur, quantité, notes, lien « Voir sur le site ».
- **Actualiser prix et stock** depuis la fiche : historique des prix relevés (« 129 € à l'ajout · plus bas : 99 € »).
- **Listes** (pièces ou projets) avec icônes, couverture en mosaïque, budget total et « reste à acheter ». Un produit peut être dans plusieurs listes.
- **Grille façon Pinterest** (chaque photo garde ses proportions), recherche sans accents (nom, boutique, marque, couleur, notes), filtres par liste et « Promos ».
- **Acheté** : un produit coché sort du « reste à acheter » ; on peut masquer les achetés dans une liste.
- **Partage Android** : une fois l'app installée, « Partager » depuis le navigateur ouvre directement l'ajout (`share_target` du manifeste). iOS ne le permet pas encore : bouton « Coller le lien ».
- **Comptes**, thème Système / Clair / Sombre.

## Lecture des pages produit

[server/utils/product-extract.ts](server/utils/product-extract.ts), par ordre de fiabilité :

1. fiche **schema.org/Product** en JSON-LD (celle publiée pour Google Shopping) : nom, photo, marque, offre (prix, prix barré `StrikethroughPrice`/`ListPrice`, stock), dimensions `width/depth/height` ;
2. balises **Open Graph** / Facebook (`og:*`, `product:price:amount`, `product:availability`…) ;
3. attributs **microdata** (`itemprop="price"`) ;
4. repères propres à **Amazon**, JSON public des boutiques **Shopify** (`/products/<handle>.js`) ;
5. **dimensions** cherchées dans le texte (« Largeur : 120 cm », « 52,5 cm de largeur », « L 120 x P 60 x H 75 cm » juste après « Dimensions »), menus et pied de page ignorés.

Testé : IKEA, Conforama, boutiques Shopify → fiche complète. **Maisons du Monde, Leroy Merlin, La Redoute, BUT** bloquent les lectures automatiques (protection anti-robots) : la fiche est créée avec le nom tiré de l'adresse et un avertissement, à compléter à la main. Les adresses internes (réseau privé) sont refusées.

## Développement

Prérequis : Node 22+.

```bash
npm install
cp .env.example .env   # puis renseigner NUXT_SESSION_PASSWORD
npm run dev            # http://localhost:3001
```

Sans `DATABASE_URL`, une base **PGlite** (vrai PostgreSQL embarqué) est créée dans `.data/pglite`. Les photos vont dans `.data/uploads`. Pour repartir de zéro : supprimer `.data/`.

Compte de test (base PGlite locale uniquement) : `demo@keepproduct.test` / `demo-keep-2026`.

- Schéma : [server/db/schema.ts](server/db/schema.ts). Après modification : `npm run db:generate` (migration SQL dans `server/db/migrations/`, appliquée au démarrage).
- Icônes de l'app et écrans de démarrage iOS : `npm run icons` (dessin dans [scripts/generate-icons.mjs](scripts/generate-icons.mjs), même tracé que `BrandMark.vue`).
- Icônes de l'interface : [Material Symbols](https://fonts.google.com/icons) (Apache 2.0, `app/assets/icons/LICENSE-material-symbols.txt`).

## Déploiement (Coolify)

Même principe que BAO : image Docker multi-stage ([Dockerfile](Dockerfile)).

| Variable | Valeur |
| --- | --- |
| `DATABASE_URL` | URL PostgreSQL fournie par Coolify |
| `NUXT_SESSION_PASSWORD` | 32 caractères aléatoires minimum (`openssl rand -hex 32`) |

Volume persistant sur **`/data/uploads`** (photos). Sonde de santé : `GET /api/health`.

Photos : téléchargées depuis le site marchand (ou envoyées depuis le téléphone), recompressées en WebP sur fond blanc (1400 px pour la fiche, 480 px pour la grille). Les photos jamais rattachées à un produit sont supprimées après 24 h.
