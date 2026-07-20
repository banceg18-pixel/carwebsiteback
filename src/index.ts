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

    // Bootstrap Pages individually if they don't exist
    const defaultPages = [
      {
        title: "Mentions Légales",
        slug: "mentions-legales",
        content: `## Mentions Légales

Conformément aux dispositions de la loi n°2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN), il est précisé aux utilisateurs du site garagegourrier.fr l'identité des différents intervenants dans le cadre de sa réalisation et de son suivi.

### Éditeur du site

- **Raison sociale** : Société par actions simplifiée
- **Activité** : Commerce de voitures et de véhicules automobiles légers
- **Code NAF / APE** : 4511Z
- **SIREN** : 870 800 927
- **SIRET du siège social** : 870 800 927 00051
- **Numéro de TVA intracommunautaire** : FR54870800927
- **Date de création** : 14 mai 1970
- **Adresse du siège social** : 365 route de Vannes, 44800 Saint-Herblain, France
- **Dirigeants** : DMD + 2 autres dirigeants
- **Téléphone** : +33 1 87 66 58 71
- **Adresse e-mail** : contact@garagegourrier.fr

### Hébergement du site

Le site est hébergé par un prestataire d'hébergement professionnel. Les coordonnées complètes de l'hébergeur peuvent être communiquées sur simple demande.

### Propriété intellectuelle

L'ensemble du contenu du site garagegourrier.fr (textes, images, graphismes, logos, icônes, vidéos, structure, mise en page, etc.) est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.

Toute reproduction, représentation, modification, publication ou adaptation, totale ou partielle, de tout ou partie du site, quel que soit le moyen ou le procédé utilisé, est interdite sans l'autorisation écrite préalable de l'éditeur.

### Responsabilité

Les informations diffusées sur le site garagegourrier.fr sont fournies à titre indicatif. L'éditeur s'efforce d'assurer l'exactitude et la mise à jour des informations, mais ne saurait être tenu responsable des omissions, inexactitudes ou carences.

L'utilisateur reconnaît utiliser les informations et services proposés sous sa responsabilité exclusive.

### Données personnelles

Le site garagegourrier.fr peut être amené à collecter des données personnelles via ses formulaires de contact.

Les informations recueillies sont utilisées uniquement dans le cadre de la relation commerciale et ne sont en aucun cas cédées à des tiers.

Conformément à la réglementation en vigueur (RGPD et loi Informatique et Libertés), l'utilisateur dispose d'un droit d'accès, de rectification, d'opposition et de suppression des données le concernant.

Toute demande peut être adressée par e-mail à : contact@garagegourrier.fr

### Cookies

Le site peut utiliser des cookies afin d'améliorer l'expérience utilisateur, mesurer l'audience et proposer des services adaptés. L'utilisateur peut configurer son navigateur pour accepter ou refuser tout ou partie des cookies.

### Droit applicable

Les présentes mentions légales sont régies par le droit français. En cas de litige, et à défaut de résolution amiable, les tribunaux français seront seuls compétents.`
      },
      {
        title: "Conditions Générales de Vente",
        slug: "cgv",
        content: `## Conditions Générales de Vente

Les présentes Conditions Générales de Vente régissent les relations contractuelles entre la société éditrice du site garagegourrier.fr et toute personne physique ou morale souhaitant procéder à l'achat d'un véhicule ou d'un service proposé sur le site.

Toute commande implique l'acceptation pleine et entière des présentes CGV.

### Identification du vendeur

- **Forme juridique** : Société par actions simplifiée
- **Activité** : Commerce de voitures et de véhicules automobiles légers
- **SIREN** : 870 800 927
- **SIRET** : 870 800 927 00051
- **TVA intracommunautaire** : FR54870800927
- **Adresse du siège social** : 365 route de Vannes, 44800 Saint-Herblain, France
- **Email** : contact@garagegourrier.fr
- **Téléphone** : +33 1 87 66 58 71

### Objet

Les présentes CGV ont pour objet de définir les conditions dans lesquelles le vendeur propose à la vente :

- Des véhicules automobiles neufs et d'occasion
- Des prestations associées (courtage, livraison, location, réparation, vente de pièces détachées)

### Véhicules proposés

Les véhicules présentés sur le site sont décrits avec la plus grande exactitude possible. Les photographies, descriptions et informations techniques sont fournies à titre indicatif et n'ont pas de valeur contractuelle.

Les véhicules d'occasion peuvent présenter une usure normale liée à leur ancienneté et à leur kilométrage.

### Commande et devis

Toute demande d'achat fait l'objet :

- D'une demande de devis préalable
- D'une validation écrite du client
- Le cas échéant, de la signature d'un devis ou d'un bon de commande

La vente n'est considérée comme définitive qu'après acceptation du devis par le client et encaissement des sommes convenues.

### Prix

Les prix sont exprimés en euros (€). Ils sont indiqués hors frais annexes éventuels (transport, livraison, formalités administratives).

Les frais de livraison sont calculés en fonction du véhicule et du lieu de destination, puis communiqués au client lors de la demande de devis.

### Modalités de paiement

Les modalités de paiement sont précisées dans le devis ou le bon de commande. La livraison du véhicule est conditionnée au paiement intégral du prix convenu.

Aucun véhicule ne pourra être remis au client tant que le règlement n'aura pas été intégralement effectué.

### Livraison

La livraison peut être effectuée :

- En France
- En Europe
- En outre-mer

Deux options sont proposées :

- Livraison classique
- Livraison express

Les délais de livraison sont donnés à titre indicatif. Un retard éventuel ne peut donner lieu à aucune indemnité ou annulation, sauf accord contraire écrit.

### Transfert de propriété et des risques

Le transfert de propriété du véhicule intervient à l'encaissement complet du prix. Le transfert des risques intervient à la remise du véhicule au client ou à son transporteur.

### Droit de rétractation

Conformément à la législation en vigueur, le droit de rétractation ne s'applique pas aux ventes de véhicules conclues en concession ou après signature d'un bon de commande définitif, sauf dispositions légales contraires.

### Garanties

Les véhicules vendus bénéficient :

- Des garanties légales en vigueur
- Le cas échéant, d'une garantie commerciale précisée lors de la vente

Les conditions de garantie sont détaillées dans les documents remis au client lors de la livraison.

### Responsabilité

Le vendeur ne saurait être tenu responsable :

- D'une mauvaise utilisation du véhicule
- D'un défaut d'entretien
- D'une usure normale

La responsabilité du vendeur est en tout état de cause limitée au montant de la vente concernée.

### Données personnelles

Les données personnelles collectées sont traitées conformément à la Politique de confidentialité disponible sur le site.

### Force majeure

Aucune des parties ne pourra être tenue responsable en cas de force majeure empêchant l'exécution de ses obligations (catastrophe naturelle, grève, panne logistique, etc.).

### Droit applicable et litiges

Les présentes CGV sont soumises au droit français. En cas de litige, une solution amiable sera recherchée en priorité. À défaut, les tribunaux français seront seuls compétents.

### Acceptation des CGV

Le client reconnaît avoir pris connaissance des présentes Conditions Générales de Vente et les accepter sans réserve avant toute commande.`
      },
      {
        title: "Politique de Confidentialité",
        slug: "politique-de-confidentialite",
        content: `## Politique de Confidentialité

La présente politique de confidentialité a pour objectif d'informer les utilisateurs du site garagegourrier.fr de la manière dont leurs données personnelles sont collectées, utilisées et protégées, conformément à la réglementation en vigueur, notamment le Règlement Général sur la Protection des Données (RGPD).

### Responsable du traitement des données

Les données personnelles collectées sur le site garagegourrier.fr sont traitées par l'éditeur du site, dans le cadre de son activité de commerce de véhicules automobiles.

Pour toute question relative à la protection des données personnelles, vous pouvez nous contacter à l'adresse suivante : contact@garagegourrier.fr

### Données collectées

Nous pouvons être amenés à collecter les données personnelles suivantes :

- Nom et prénom
- Adresse e-mail
- Numéro de téléphone
- Informations communiquées via les formulaires de contact ou de demande de devis
- Toute information transmise volontairement par l'utilisateur

Ces données sont collectées uniquement lorsque l'utilisateur les renseigne de manière volontaire.

### Finalités du traitement

Les données personnelles collectées sont utilisées pour les finalités suivantes :

- Répondre aux demandes de contact ou de devis
- Assurer le suivi des échanges commerciaux
- Pourvoir des informations relatives à nos services et véhicules
- Améliorer la qualité du service et la relation client

Les données ne sont en aucun cas utilisées à des fins commerciales non autorisées.

### Conservation des données

Les données personnelles sont conservées uniquement pour la durée nécessaire aux finalités pour lesquelles elles ont été collectées, et dans le respect des obligations légales et réglementaires.

### Partage des données

Les données personnelles collectées ne sont ni vendues, ni cédées, ni louées à des tiers.

Elles peuvent toutefois être transmises à des partenaires ou prestataires uniquement lorsque cela est nécessaire à l'exécution d'un service (transport, livraison, démarches administratives), dans le respect strict de la confidentialité.

### Sécurité des données

Nous mettons en oeuvre toutes les mesures techniques et organisationnelles appropriées afin de garantir la sécurité, l'intégrité et la confidentialité des données personnelles, et de prévenir tout accès non autorisé, perte ou divulgation.

### Droits des utilisateurs

Conformément à la réglementation en vigueur, l'utilisateur dispose des droits suivants :

- Droit d'accès à ses données
- Droit de rectification
- Droit d'effacement
- Droit d'opposition
- Droit à la limitation du traitement
- Droit à la portabilité des données

Toute demande relative à l'exercice de ces droits peut être adressée par e-mail à : contact@garagegourrier.fr

### Cookies

Le site garagegourrier.fr peut utiliser des cookies afin d'améliorer l'expérience utilisateur, mesurer l'audience et optimiser le fonctionnement du site.

L'utilisateur peut configurer son navigateur pour accepter ou refuser les cookies à tout moment.

### Modification de la politique de confidentialité

La présente politique de confidentialité peut être modifiée à tout moment afin de garantir sa conformité avec la législation en vigueur. La date de la dernière mise à jour fait foi.

### Droit applicable

La présente politique de confidentialité est régie par le droit français. En cas de litige, les juridictions françaises seront seules compétentes.`
      },
      {
        title: "Conditions Générales d'Utilisation",
        slug: "cgu",
        content: `## Conditions Générales d'Utilisation (CGU)

En accédant et en utilisant le site garagegourrier.fr, vous acceptez sans réserve les présentes conditions générales d'utilisation.

### Article 1 - Accès au site

Le site est accessible gratuitement à tout utilisateur disposant d'un accès à internet.

### Article 2 - Propriété intellectuelle

L'ensemble du contenu de ce site (textes, images, logos) est la propriété exclusive de GARAGE GOURRIER. Toute reproduction ou représentation, totale ou partielle, sans autorisation écrite préalable est interdite.

### Article 3 - Liens hypertextes

Le site peut contenir des liens vers d'autres sites internet. GARAGE GOURRIER n'est pas responsable du contenu de ces sites externes.

### Article 4 - Limitation de responsabilité

GARAGE GOURRIER s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur ce site, mais ne saurait être tenu responsable des erreurs ou omissions.

### Article 5 - Cookies

Le site peut utiliser des cookies pour améliorer l'expérience utilisateur. L'utilisateur peut configurer son navigateur pour refuser les cookies.

### Article 6 - Droit applicable

Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux français seront seuls compétents.`
      }
    ];

    for (const page of defaultPages) {
      const exists = await strapi.db.query('api::page.page').findOne({ where: { slug: page.slug } });
      if (!exists) {
        console.log(`Seeding page: ${page.title}...`);
        try {
          await strapi.documents('api::page.page').create({
            data: page,
            status: 'published',
          });
          console.log(`Successfully seeded page: ${page.title}!`);
        } catch (err) {
          console.error(`Failed to seed page ${page.title}:`, err);
        }
      }
    }
  },
};
