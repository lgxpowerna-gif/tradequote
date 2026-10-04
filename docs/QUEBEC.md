# Branche feat/quebec-rbq-tps-tvq — résumé

- Français par défaut : une préférence enregistrée reste prioritaire. `<html lang="fr-CA">`, métadonnées en français, montants en format fr-CA (1 234,56 $).
- Taxes : `lib/tax.ts`. Préréglage par défaut **Québec : TPS 5 % + TVQ 9,975 %**. Chaque taxe est calculée séparément sur le montant avant taxes (pas de taxe sur la taxe) et arrondie au cent. Les taxes apparaissent sur des lignes séparées dans l'aperçu et dans le PDF. Champs N° TPS/TVH et **N° TVQ** imprimés sur le PDF.
- Tarifs : vraies pages `/tarifs` (FR) et `/pricing` (EN), avec FAQ et un lien vers `/?view=pricing` pour le paiement. Liens dans le pied de page. Prix affichés à 19 $/mois (depuis le 3 oct. 2026 ; avant : 9 $) et 190 $/an (avant : 79 $) : ils doivent correspondre aux prix Stripe (`STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`).
- Pro : vérifié côté serveur via `/api/subscription-status` (Stripe). `tq_plan` dans localStorage est ignoré. Le compteur gratuit se remet à zéro chaque mois. Voir `money-plan/08-plan-pro-serveur.md` pour la phase 2.
- Tests : `npm test` (`scripts/test.mjs`, sans dépendance ajoutée).
- **Licence RBQ** : champ avec mise en forme automatique XXXX-XXXX-XX et validation à 10 chiffres (`lib/rbq.ts`). Le numéro est imprimé en gras dans l'en-tête et dans le bloc « DE » de chaque soumission et facture, et il apparaît dans l'aperçu.
- Vocabulaire : « Soumission » au lieu de « Devis » (numéros S-/F-), « Chantier », « Avenant », modèles de métiers traduits, bandeau d'accroche au-dessus du formulaire.

## Ajouts (publication)
- Pages légales FR/EN : `/confidentialite` `/privacy` (Loi 25 ; responsable : le responsable de la protection des renseignements personnels ; lgxpowerna@gmail.com), `/conditions` `/terms`, `/contact` `/contact-us`. Liens dans le pied de page et sous chaque bouton de paiement Pro.
- `POST /api/portal` : ouvre le portail client Stripe (gérer / annuler) pour l'abonnement mémorisé dans le navigateur. Le portail doit être activé une fois dans Stripe (Paramètres → Facturation → Portail client) ; sinon, l'interface affiche l'annulation par courriel.
- Compatibilité : les anciens utilisateurs Pro (ancienne clé `*_plan` = "pro") gardent le Pro jusqu'au 31 déc. 2026, avec un bandeau. Lien de restauration : `/?restore=sub_…` (id de l'abonnement dans Stripe). La langue enregistrée par l'ancienne version (toujours "en") n'est plus imposée ; seul un choix explicite est respecté.

## Ajouts (3 octobre 2026) — historique complet, export comptable, envoyer/planifier, Toiture
- **Historique complet** (`lib/docs.ts`) : chaque PDF téléchargé ou partagé enregistre le document complet (client, chantier, dates des travaux, lignes, taxes, remise, acompte, totaux). Boutons Ouvrir / Dupliquer / PDF dans l'Historique. Les anciennes entrées (résumé seulement) restent affichées avec la mention « Résumé seulement ». Numérotation séquentielle par année (S-2026-0001, F-2026-0001…, suite du plus grand numéro existant). Re-télécharger le même numéro pour le même client met l'entrée à jour sans compter un document de plus ; un numéro déjà utilisé par un autre client reçoit un nouveau numéro (rien n'est écrasé).
- **Sauvegarde v2** (`lib/backup.ts`) : `version: 2`, les entrées peuvent contenir `doc`. Les fichiers v1 sont toujours acceptés (entrées résumé). En fusion, une entrée résumé est complétée par le document complet du fichier.
- **Export comptable (Pro)** (`lib/accounting.ts`, `components/AccountingExport.tsx`) : CSV d'import de factures QuickBooks en ligne (une ligne par article ; InvoiceNo, Customer, InvoiceDate, DueDate, Terms, Location, Memo, Item(Product/Service), ItemDescription, ItemQuantity, ItemRate, ItemAmount, ItemTaxCode ; dates JJ/MM/AAAA ; remise intégrée aux lignes car QBO refuse les lignes négatives ; max. 100 factures / 1 000 lignes par fichier) et CSV Excel (BOM UTF-8, « ; » et virgule décimale en français) avec colonnes TPS, TVQ, TVH, autre taxe, acompte, solde. Filtre par période. Les entrées résumé ne sont pas exportées (compteur affiché). Pas de fichier Sage 50 / Acomba : voir le rapport.
- **Envoyer / planifier** (`lib/schedule.ts`) : « Partager / Envoyer » utilise la Web Share API avec le fichier PDF (téléphones) ; sinon le PDF est téléchargé et un courriel `mailto:` pré-rempli s'ouvre (le PDF doit être joint à la main). « Ajouter à l'agenda » : lien Google Agenda (événement sur toute la journée, du début à la fin des travaux) et fichier .ics (Outlook, Apple). Champs « Date des travaux » et « Fin des travaux ».
- **Modèle Toiture** (`lib/i18n.ts`) : 10 lignes typiques, tous les prix à 0 $.
- Gratuit : historique complet, partage, agenda, modèles. Pro : illimité, sans filigrane, export comptable.

## Ajouts (3 octobre 2026, suite) — logo, carnet de clients, ergonomie
- **Logo sur le PDF** (`lib/logo.ts`, `components/LogoPicker.tsx`) : PNG ou JPG (max. 5 Mo à l'envoi), redimensionné dans le navigateur (600 px max.) et compressé (≤ ~150 Ko), conservé dans `tq_logo`. Imprimé dans l'en-tête du PDF. Gratuit pour tous.
- **Carnet de clients** (`lib/clients.ts`, `components/ClientsPanel.tsx`) : chaque PDF téléchargé ou partagé enregistre le client (nom, adresse, ville, courriel, téléphone) dans `tq_clients`. Suggestions sur le champ « Nom du client » et remplissage automatique. Onglet « Clients » pour rechercher, modifier ou supprimer.
- **Sauvegarde v3** : inclut le carnet de clients et le logo. Les fichiers v1 et v2 restent importables (en mode « Remplacer », le carnet et le logo actuels sont conservés).
- **Brouillon** : le document en cours est conservé dans `tq_draft` (plus rien de perdu au rechargement).
- **Ergonomie** : navigation mobile (onglets), barre fixe Total / Partager / PDF sur mobile, en-têtes de colonnes, champs étiquetés sur mobile, panneau « Votre entreprise » replié une fois rempli, date de validité/échéance imprimée sur le PDF, notes de facture distinctes à la conversion (avec « Réf. : soumission S-… »).

## Ajouts (3 octobre 2026, suite 2) — statuts, lignes à 0 $, configuration initiale
- **Lignes à 0 $** : les lignes sans description ET à 0 $ ne sont jamais imprimées. Les lignes avec une description à 0 $ déclenchent un avertissement (« X ligne(s) à 0 $ ») au-dessus des lignes et avant le téléchargement ou le partage : les retirer ou les garder. Bouton « Retirer les lignes à 0 $ » et bouton ✕ (36 px sur téléphone) sur chaque ligne.
- **Statuts dans l'Historique** (`lib/status.ts`) : soumissions Brouillon / Envoyée / Acceptée / Refusée ; factures Envoyée / Payée (avec date de paiement). Une soumission seulement téléchargée = Brouillon, partagée = Envoyée ; facture = Envoyée. Filtre par statut. Anciennes entrées sans statut = Envoyée.
- **Sauvegarde v4** : statut et date de paiement inclus ; fichiers v1 à v3 toujours importables. **CSV Excel** : colonnes « Statut » et « Date de paiement ».
- **Configuration initiale** (`components/Onboarding.tsx`) : 3 étapes (entreprise + RBQ, TPS/TVQ + logo facultatifs, modèle de métier), possible de passer, jamais réaffichée (`tq_onboarded`). Jamais montrée si un nom d'entreprise, un document ou un abonnement existe, ni après l'import d'une sauvegarde.
- **Divers** : message de confirmation intégré à la barre du bas (téléphone) et à l'en-tête de l'aperçu (ordinateur), au lieu de flotter sur le contenu ; étapes claires pour joindre le PDF quand le partage direct n'est pas offert ; icône du site (favicon, icône Apple).

## Ajouts (3 octobre 2026, suite 3) — régions et langues

Le Québec reste la région par défaut (aucune région enregistrée = Québec) et son expérience est inchangée :
mêmes PDF, mêmes totaux TPS/TVQ, même RBQ, mêmes exports et mêmes sauvegardes (v4). Autres provinces, États-Unis,
France, Belgique et Suisse ajoutés, ainsi que l'interface et les PDF en anglais, chinois simplifié et arabe.
Détails, taux et sources : `docs/REGIONS.md`.
