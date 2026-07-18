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
        const dataPath = path.resolve(process.cwd(), '../Site_principale/src/data/vehicles.json');
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
        const dataPath = path.resolve(process.cwd(), '../Site_principale/src/data/vehicles.json');
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
            content: "## Mentions Légales\n\nLe présent site est édité par :\n\n**GARAGE GOURRIER**\nSociété à responsabilité limitée (SARL) au capital de 6 000 €\nSiège social : Fraissinet de Lozère Bourg, 48220 Pont de Montvert Sud Mont Lozère\nSIREN : 812 433 589\n\n### Hébergement\nLe site est hébergé par Vercel Inc.\n\n### Données Personnelles\nConformément à la loi informatique et libertés, vous bénéficiez d'un droit d'accès et de rectification de vos données."
          },
          status: 'published',
        });
        await strapi.documents('api::page.page').create({
          data: {
            title: "Conditions Générales de Vente",
            slug: "cgv",
            content: "## Conditions Générales de Vente (CGV)\n\nApplicables à tous les véhicules d'occasion vendus par GARAGE GOURRIER.\n\n### Article 1 — Objet et champ d'application\nLes présentes CGV régissent l'ensemble des ventes de véhicules automobiles d'occasion."
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
