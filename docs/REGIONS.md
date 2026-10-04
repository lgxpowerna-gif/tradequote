# Régions, taxes et langues

TradeQuote est **fait pour le Québec** : c'est la région par défaut, pour les nouveaux utilisateurs comme pour
tous les utilisateurs existants (aucune région enregistrée = Québec). L'expérience québécoise est inchangée
(voir « Non-régression Québec » plus bas). Les autres régions sont offertes en plus.

La région se choisit à la configuration initiale et dans « Votre entreprise » (pays + province / État). Elle
détermine les taxes proposées, la devise, le format des dates, les numéros d'entreprise imprimés et la langue par
défaut (français pour Québec, France, Belgique et Suisse ; anglais ailleurs). La langue peut toujours être changée
à la main (FR, EN, 中文, العربية) ; un choix manuel est conservé.

## Taux (vérifiés le 3 octobre 2026)

Les taux sont des valeurs fixes du code (`lib/tax.ts`) : à revoir si un gouvernement les modifie. L'utilisateur
reste responsable de choisir le bon régime de taxes (voir les conditions d'utilisation).

### Canada

| Province / territoire | Taxes | Préréglage |
|---|---|---|
| Québec | TPS 5 % + TVQ 9,975 % (calculées séparément sur le montant avant taxes) | `gst-qst-qc` |
| Ontario | TVH 13 % | `hst-on` |
| Nouvelle-Écosse | TVH 14 % (depuis le 1er avril 2025) | `hst-ns` |
| Nouveau-Brunswick, Terre-Neuve-et-Labrador, Î.-P.-É. | TVH 15 % | `hst-nb` |
| Colombie-Britannique | TPS 5 % + TVP 7 % | `gst-pst-bc` |
| Saskatchewan | TPS 5 % + TVP 6 % | `gst-pst-sk` |
| Manitoba | TPS 5 % + TVD 7 % | `gst-rst-mb` |
| Alberta, Yukon, T.N.-O., Nunavut | TPS 5 % | `gst` |

Sources :
- ARC, calculatrice des taux TPS/TVH : https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate/calculator.html
  (contenu lu via l'index d'un moteur de recherche ; la page n'a pas pu être téléchargée directement depuis notre environnement).
- Nouvelle-Écosse 14 % : https://www.novascotia.ca/sites/default/files/documents/1-3953/tax-101-harmonized-sales-tax-en.pdf ;
  communiqué du gouvernement de la N.-É. du 23 octobre 2024 ; Gazette du Canada DORS/2025-77 :
  https://gazette.gc.ca/rp-pr/p2/2025/2025-03-26/html/sor-dors77-eng.html

Chaque taxe est arrondie au cent séparément (comme avant pour le Québec). Les taxes provinciales de vente au détail
(TVP / TVD) peuvent ne pas s'appliquer à certains services : l'utilisateur peut choisir « TPS 5 % seulement »,
« Aucune taxe » ou un taux personnalisé.

### États-Unis

Pas de taux intégré : les taxes de vente varient selon l'État, le comté et la ville, et beaucoup d'États ne taxent
pas certains services. L'utilisateur entre le taux de l'État et, au besoin, un taux local ; chaque taxe est arrondie
au cent. Montants en USD, dates MM/JJ/AAAA. Export QuickBooks : lignes marquées `TAX` / `NON`.

### France

- TVA 20 % (normal), 10 % (travaux d'amélioration, de transformation, d'aménagement et d'entretien de logements
  achevés depuis plus de 2 ans), 5,5 % (travaux de rénovation énergétique) : taux choisi par ligne ou pour tout le
  document. La remise est répartie au prorata entre les taux ; la base HT de chaque taux est arrondie, puis la TVA.
- Franchise en base : aucune TVA, mention imprimée « TVA non applicable, art. 293 B du CGI » ; variante avec la
  mention « TVA non applicable, art. L. 223 et s. du CIBS ».
- N° SIRET et n° de TVA intracommunautaire imprimés ; montants en EUR ; dates JJ/MM/AAAA ; libellés HT / TTC.

Sources :
- https://www.economie.gouv.fr/entreprises/gerer-sa-fiscalite-et-ses-impots/autres-impots-et-taxes/entreprises-ce-que-vous-devez-savoir-sur-la-tva
- https://www.economie.gouv.fr/cedef/taux-tva-france-et-union-europeenne
- Travaux dans les logements : https://entreprendre.service-public.gouv.fr/vosdroits/F23568
- Franchise en base et mentions : https://entreprendre.service-public.gouv.fr/vosdroits/F36244
  (la mention CIBS s'applique à compter du 1er septembre 2026 ; l'ancienne mention 293 B est tolérée jusqu'au
  31 décembre 2027. Un éventuel report n'a pas pu être confirmé : à vérifier.)
- Mentions obligatoires des factures : https://entreprendre.service-public.gouv.fr/vosdroits/F31808

Non pris en charge : taux des DOM (Guadeloupe, Martinique, La Réunion…), autoliquidation de la sous-traitance BTP,
mentions d'assurance décennale et de pénalités de retard (à ajouter dans les notes si nécessaire).

### Belgique

TVA 21 % / 12 % / 6 % (6 % notamment pour certains travaux de rénovation de logements privés, sous conditions), n° BCE et
n° de TVA, EUR.
- https://fin.belgium.be/fr/particuliers/habitation/construire-renover/renover/renover-taux-de-tva
- Loi du 10 février 2026 (Moniteur belge) : https://www.ejustice.just.fgov.be/eli/loi/2026/02/10/2026001291/justel
- La page principale des taux du SPF Finances est protégée par un captcha et n'a pas pu être consultée.

### Suisse

TVA 8,1 % (normal), 2,6 % (réduit), 3,8 % (hébergement), n° IDE (CHE-…), CHF, dates JJ.MM.AAAA.
- https://www.estv.admin.ch/fr/taux-de-la-tva-suisse
- https://www.estv.admin.ch/fr/relevement-tva-taux-impot-2024
- Non pris en charge : arrondi aux 5 centimes.

## Langues

- Français et anglais : interface, PDF, exports, courriels de partage, agenda.
- Chinois simplifié et arabe : interface et PDF (police intégrée dans le PDF : sous-ensembles de Noto Sans SC et
  Noto Sans Arabic, `public/fonts`, licence SIL OFL). L'arabe est affiché de droite à gauche (`dir="rtl"`) ;
  dans le PDF, le texte arabe est mis en forme (ligatures) et placé de droite à gauche, tandis que les montants, dates,
  numéros de taxe et noms en caractères latins gardent leur ordre. Pas de logique fiscale chinoise (fapiao).
  Les dictionnaires chinois et arabe sont chargés seulement quand on choisit ces langues.
- Pour les utilisateurs en chinois ou en arabe, le texte du courriel de partage, l'événement d'agenda et les en-têtes
  des CSV restent en anglais.
- Pages légales en chinois et en arabe : traductions de courtoisie ; la version française prévaut.

## Sauvegarde

Les sauvegardes d'un profil Québec restent au format version 4, identiques à avant (aucune clé de région). Les
autres régions écrivent la version 5 avec la région et les champs propres à la région (`pst`, `licence`, `regNo`,
`vatNo`). Un fichier sans région est importé comme Québec.

## Non-régression Québec

Avant la mise en production, le même scénario Québec est joué sur la production actuelle et sur la nouvelle version
(`qc-compare.mjs` dans le dossier d'assurance qualité) : PDF de soumission et de facture (texte et rendu au pixel
près), totaux TPS/TVQ et arrondis, validation et affichage RBQ, libellés français, exports QuickBooks et Excel,
export et import de sauvegarde (ancien format v1 et fichier v4 de la production). Seules différences visibles
voulues : la ligne « Fait pour le Québec. Aussi disponible partout au Canada, aux États-Unis et en France. », le choix
de région (Canada / Québec par défaut) et le choix de langue dans la configuration initiale, et, dans le menu des
taxes, l'ajout de « Nouvelle-Écosse — TVH 14 % » (le libellé TVH 15 % ne mentionne plus la N.-É.).
