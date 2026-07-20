import type { Core } from '@strapi/strapi';
import fs from 'fs';
import path from 'path';

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // Import vehicles if DB is empty
    const count = await strapi.db.query('api::vehicle.vehicle').count();
    
    if (count === 0) {
      console.log('Database is empty. Importing vehicles.json...');
      try {
        const dataPath = path.resolve(process.cwd(), 'src/data/vehicles.json');
        console.log('Trying to read from:', dataPath);
        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        const vehicles = JSON.parse(fileContent);

        for (const v of vehicles) {
          // In Strapi v5, we use the documents API (draft/publish)
          await strapi.documents('api::vehicle.vehicle').create({
            data: {
              title: v.title,
              price: v.price || '',
              shortDesc: v.shortDesc || '',
              description: v.description || '',
              categories: v.categories || [],
              attributes: v.attributes || {},
              equipments: v.equipments || [],
              originalLink: v.link || '',
            },
            status: 'published',
          });
        }
        console.log(`Successfully imported ${vehicles.length} vehicles!`);

        // Enable public access
        const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
        if (publicRole) {
          const actions = [
            'api::vehicle.vehicle.find', 
            'api::vehicle.vehicle.findOne', 
            'api::global.global.find',
            'api::category.category.find',
            'api::category.category.findOne',
            'api::review.review.find',
            'api::message.message.create',
            'api::page.page.find',
            'api::page.page.findOne'
          ];
          for (const action of actions) {
            const exists = await strapi.db.query('plugin::users-permissions.permission').findOne({ where: { action, role: publicRole.id } });
            if (!exists) {
              await strapi.db.query('plugin::users-permissions.permission').create({
                data: { action, role: publicRole.id }
              });
            }
          }
          console.log('Public permissions granted for APIs!');
        }
      } catch (err) {
        console.error('Failed to import vehicles:', err);
      }
    }

    // Patch missing images if any
    const allVehiclesToPatch = await strapi.documents('api::vehicle.vehicle').findMany({
      limit: 1000
    });
    if (allVehiclesToPatch.length > 0) {
      console.log('Patching vehicles with images...');
      try {
        const dataPath = path.resolve(process.cwd(), 'src/data/vehicles.json');
        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        const jsonVehicles = JSON.parse(fileContent);
        
        for (const v of allVehiclesToPatch) {
          const jsonV = jsonVehicles.find((jv: any) => jv.link === v.originalLink);
          if (jsonV) {
            await strapi.documents('api::vehicle.vehicle').update({
              documentId: v.documentId,
              data: {
                imageUrl: jsonV.image || '',
                galleryUrls: jsonV.gallery || []
              },
              status: 'published'
            });
          }
        }
        console.log('Patch complete!');
      } catch (err) {
        console.error('Failed to patch images:', err);
      }
    }

    // Bootstrap Global Settings if empty
    const globalCount = await strapi.db.query('api::global.global').count();
    if (globalCount === 0) {
      console.log('Global settings are empty. Seeding defaults...');
      try {
        await strapi.documents('api::global.global').create({
          data: {
            phoneNumber: '01 87 66 58 71',
            email: 'contact@garagegourrier.fr',
            companyName: 'Garage Gourrier',
            heroTitle: "Votre spécialiste des véhicules d'occasion",
            heroSubtitle: "Citadines, SUV, Utilitaires. Des véhicules révisés, garantis, et prêts à prendre la route. Livraison partout en France et en Europe.",
            aboutText: "Nous sommes experts depuis plus de 10 ans dans le domaine automobile."
          },
          status: 'published',
        });
        console.log('Successfully seeded global settings!');
      } catch (err) {
        console.error('Failed to seed global settings:', err);
      }
    }

    // Bootstrap Categories if empty
    const categoryCount = await strapi.db.query('api::category.category').count();
    if (categoryCount === 0) {
      console.log('Categories are empty. Seeding defaults...');
      try {
        const defaultCategories = [
          { name: 'BMW', slug: 'bmw', description: 'Série 1, Série 3, X1, X3...' },
          { name: 'Peugeot', slug: 'peugeot', description: '208, 308, 2008, 3008...' },
          { name: 'Utilitaires', slug: 'vehicule-utilitaire', description: 'Berlingo, Kangoo, Master...' }
        ];

        for (const cat of defaultCategories) {
          await strapi.documents('api::category.category').create({
            data: cat,
            status: 'published',
          });
        }
        console.log('Successfully seeded categories!');
      } catch (err) {
        console.error('Failed to seed categories:', err);
      }
    }

    // Bootstrap Reviews if empty
    const reviewCount = await strapi.db.query('api::review.review').count();
    if (reviewCount === 0) {
      console.log('Reviews are empty. Seeding defaults...');
      try {
        const defaultReviews = [
          { name: "Thomas D.", role: "Achat d'une Peugeot 3008", content: "Très satisfait de mon achat. Le véhicule était dans un état impeccable, révisé comme promis. L'équipe a été très professionnelle et transparente de A à Z.", rating: 5, date: "Il y a 2 semaines" },
          { name: "Sophie L.", role: "Achat d'une Fiat 500", content: "Service au top ! Ils se sont occupés de toutes les démarches administratives, y compris la carte grise. Je recommande vivement pour leur sérieux et leur rapidité.", rating: 5, date: "Il y a 1 mois" },
          { name: "Marc A.", role: "Achat d'un utilitaire Renault Master", content: "En tant que professionnel, j'avais besoin d'un véhicule fiable rapidement. Ils ont compris mon besoin et la livraison s'est faite en un temps record directement sur mon chantier.", rating: 4, date: "Il y a 2 mois" }
        ];
        for (const rev of defaultReviews) {
          await strapi.documents('api::review.review').create({
            data: rev,
            status: 'published',
          });
        }
        console.log('Successfully seeded reviews!');
      } catch (err) {
        console.error('Failed to seed reviews:', err);
      }
    }

    // Bootstrap Pages if empty
    const pageCount = await strapi.db.query('api::page.page').count();
    if (pageCount === 0) {
      console.log('Pages are empty. Seeding defaults...');
      try {
        await strapi.documents('api::page.page').create({
          data: {
            title: "Mentions Légales",
            slug: "mentions-legales",
            content: `## Mentions Légales

### 1. Éditeur du site

Le présent site est édité par :

**GARAGE GOURRIER**
Société à responsabilité limitée (SARL)
Siège social : Fraissinet de Lozère Bourg, 48220 Pont de Montvert Sud Mont Lozère
SIREN : 812 433 589
Numéro de TVA intracommunautaire : FR 812 433 589
Téléphone : 01 87 66 58 71
Email : contact@garagegourrier.fr
Gérant : Florent GOURRIER

### 2. Hébergement

Le site est hébergé par :
**Hostinger International Ltd**
61 Lordou Vironos Street, 6023 Larnaca, Chypre

### 3. Propriété intellectuelle

L'ensemble du contenu de ce site (textes, photographies, images, logos) est la propriété exclusive de Garage Gourrier ou de ses partenaires et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.

Toute reproduction, représentation, modification, publication ou adaptation totale ou partielle des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable de Garage Gourrier.

### 4. Données personnelles

Conformément à la loi n°78-17 du 6 janvier 1978 modifiée relative à l'informatique, aux fichiers et aux libertés, et au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification, de portabilité et de suppression des données vous concernant.

Pour exercer ces droits, vous pouvez nous contacter à l'adresse suivante : contact@garagegourrier.fr

### 5. Cookies

Le site peut utiliser des cookies pour améliorer l'expérience utilisateur. En naviguant sur ce site, vous acceptez l'utilisation de cookies conformément à notre politique de confidentialité.

### 6. Responsabilité

Garage Gourrier s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur ce site. Cependant, Garage Gourrier décline toute responsabilité pour les erreurs ou omissions présentes sur le site.

### 7. Loi applicable

Le présent site et ses mentions légales sont soumis au droit français. Tout litige relatif au site sera soumis à la compétence des tribunaux français.`
          },
          status: 'published',
        });
        await strapi.documents('api::page.page').create({
          data: {
            title: "Conditions Générales de Vente",
            slug: "cgv",
            content: `## Conditions Générales de Vente (CGV)

**Garage Gourrier** — SIREN 812 433 589
Fraissinet de Lozère Bourg, 48220 Pont de Montvert Sud Mont Lozère
Mises à jour le : ${new Date().toLocaleDateString('fr-FR')}

---

### Article 1 — Objet et champ d'application

Les présentes Conditions Générales de Vente (CGV) régissent l'ensemble des ventes de véhicules automobiles d'occasion et de prestations de services réalisées par Garage Gourrier auprès de ses clients, qu'ils soient particuliers ou professionnels.

Toute commande implique l'acceptation sans réserve de ces CGV. Garage Gourrier se réserve le droit de modifier ses CGV à tout moment.

### Article 2 — Description des véhicules

Chaque véhicule proposé à la vente est décrit avec le plus grand soin (kilométrage, année, état général, équipements). Toutefois, les véhicules d'occasion peuvent présenter des traces normales d'usure liées à leur utilisation antérieure.

Avant toute vente, chaque véhicule fait l'objet d'une révision complète par nos techniciens qualifiés.

### Article 3 — Prix

Les prix affichés sur le site sont indiqués en euros (€) toutes taxes comprises (TTC). Garage Gourrier se réserve le droit de modifier ses prix à tout moment, mais les véhicules sont facturés au prix en vigueur au moment de la confirmation de commande.

Les frais de carte grise et d'immatriculation sont à la charge de l'acheteur, sauf mention contraire.

### Article 4 — Réservation et commande

La réservation d'un véhicule s'effectue via le site internet ou directement en concession. Un acompte de confirmation pourra être demandé pour sécuriser votre réservation. Cet acompte sera déduit du prix de vente final.

La vente n'est définitive qu'après signature du bon de commande et encaissement de l'acompte.

### Article 5 — Paiement

Le solde du prix de vente est réglé au moment de la remise des clés. Les moyens de paiement acceptés sont :

- Virement bancaire
- Chèque de banque (obligatoire pour tout montant supérieur à 1 000 €)
- Financement par organisme de crédit partenaire

Le paiement en espèces est limité à 1 000 € conformément à la réglementation en vigueur.

### Article 6 — Livraison

Garage Gourrier propose un service de livraison à domicile sur toute la France métropolitaine. Les frais et délais de livraison sont communiqués au moment de la commande.

Le client est responsable de la réception du véhicule. Il lui appartient de vérifier l'état du véhicule à la livraison et de formuler toute réserve par écrit dans les 48 heures.

### Article 7 — Garantie

Tous les véhicules vendus par Garage Gourrier bénéficient de la garantie légale de conformité (articles L217-4 et suivants du Code de la consommation) ainsi que de la garantie contre les vices cachés (articles 1641 et suivants du Code civil).

Garage Gourrier propose également des extensions de garantie commerciale via ses partenaires, dont les modalités sont précisées sur devis.

### Article 8 — Droit de rétractation

Conformément aux articles L221-18 et suivants du Code de la consommation, pour toute vente conclue à distance (via le site internet), le client particulier dispose d'un délai de 14 jours calendaires pour exercer son droit de rétractation, sans avoir à justifier de motifs ni à payer de pénalités.

Pour exercer ce droit, le client doit notifier sa décision par courrier électronique à contact@garagegourrier.fr ou par courrier recommandé à l'adresse du siège social.

### Article 9 — Litiges

En cas de litige, le client peut saisir le médiateur de la consommation compétent ou s'adresser aux tribunaux compétents du ressort du siège social de Garage Gourrier.

### Article 10 — Données personnelles

Les informations collectées lors de la commande sont traitées conformément à notre politique de confidentialité et au RGPD. Elles sont utilisées uniquement pour le traitement de votre commande et ne sont pas transmises à des tiers sans votre consentement.

Pour exercer vos droits : contact@garagegourrier.fr`
          },
          status: 'published',
        });
        await strapi.documents('api::page.page').create({
          data: {
            title: "Conditions Générales d'Utilisation",
            slug: "cgu",
            content: `## Conditions Générales d'Utilisation (CGU)

**Garage Gourrier** — SIREN 812 433 589
Mises à jour le : ${new Date().toLocaleDateString('fr-FR')}

---

### Article 1 — Objet

Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir les modalités et conditions d'utilisation du site internet de Garage Gourrier, accessible à l'adresse garagegourrier.fr, ainsi que de définir les droits et obligations des parties dans ce cadre.

### Article 2 — Accès au site

Le site est accessible gratuitement à tout utilisateur disposant d'un accès à internet. Tous les frais supportés par l'utilisateur pour accéder au service (matériel informatique, connexion internet, etc.) sont à sa charge.

Garage Gourrier se réserve le droit de refuser l'accès au site, unilatéralement et sans notification préalable, à tout utilisateur ne respectant pas les présentes CGU.

### Article 3 — Navigation et cookies

Le site peut utiliser des cookies afin d'améliorer l'expérience utilisateur. L'utilisateur a la possibilité de désactiver les cookies depuis les paramètres de son navigateur, étant précisé que cela peut affecter certaines fonctionnalités du site.

### Article 4 — Propriété intellectuelle

L'ensemble du contenu du site (textes, images, vidéos, logos, icônes) est la propriété de Garage Gourrier et est protégé par le droit d'auteur. Toute reproduction ou représentation, même partielle, sans autorisation expresse est interdite.

### Article 5 — Responsabilité

Garage Gourrier met tout en œuvre pour offrir aux utilisateurs des informations et/ou des outils disponibles et vérifiés, mais ne saurait être tenu responsable des erreurs, d'une absence de disponibilité des fonctionnalités et/ou de la présence de virus sur son site.

L'utilisateur est responsable de la sécurité de son équipement informatique. Garage Gourrier décline toute responsabilité pour tout dommage subi par l'utilisateur ou par des tiers du fait de l'utilisation du site.

### Article 6 — Liens hypertextes

Le site peut contenir des liens vers d'autres sites internet. Ces liens sont fournis à titre informatif. Garage Gourrier ne saurait être tenu responsable du contenu des sites tiers vers lesquels des liens hypertextes pointent.

### Article 7 — Protection des données personnelles

Dans le cadre de l'utilisation du site, Garage Gourrier est susceptible de collecter des données à caractère personnel vous concernant. Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants :

- **Droit d'accès** : vous pouvez demander une copie des données vous concernant.
- **Droit de rectification** : vous pouvez demander la correction de données inexactes.
- **Droit à l'effacement** : vous pouvez demander la suppression de vos données.
- **Droit d'opposition** : vous pouvez vous opposer au traitement de vos données.
- **Droit à la portabilité** : vous pouvez demander le transfert de vos données.

Pour exercer ces droits, contactez-nous à : contact@garagegourrier.fr

### Article 8 — Modification des CGU

Garage Gourrier se réserve le droit de modifier les présentes CGU à tout moment. Les modifications prennent effet dès leur mise en ligne. L'utilisateur est invité à consulter régulièrement les CGU.

### Article 9 — Loi applicable et juridiction compétente

Les présentes CGU sont soumises au droit français. Tout litige relatif à leur interprétation ou à leur exécution relève de la compétence exclusive des juridictions françaises.`
          },
          status: 'published',
        });
        console.log('Successfully seeded pages!');
      } catch (err) {
        console.error('Failed to seed pages:', err);
      }
    }
  },
};
