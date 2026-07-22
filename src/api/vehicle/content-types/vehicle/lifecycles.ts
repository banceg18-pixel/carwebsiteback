export default {
  async beforeCreate(event: any) {
    const { data } = event.params;
    if (data) {
      if (data.mainImage) {
        try {
          const file = await (strapi as any).entityService.findOne('plugin::upload.file', data.mainImage);
          if (file && file.url) {
            data.imageUrl = file.url;
          }
        } catch (err) {
          console.warn('⚠️ [LIFECYCLE] Impossible d\'auto-remplir imageUrl depuis mainImage:', err);
        }
      }
      if (data.imageUrl && data.imageUrl.includes('urbanautoselection.com')) {
        data.imageUrl = '';
      }
    }
  },

  async beforeUpdate(event: any) {
    const { data } = event.params;
    if (data) {
      if (data.mainImage) {
        try {
          const file = await (strapi as any).entityService.findOne('plugin::upload.file', data.mainImage);
          if (file && file.url) {
            data.imageUrl = file.url;
          }
        } catch (err) {
          console.warn('⚠️ [LIFECYCLE] Impossible d\'auto-remplir imageUrl depuis mainImage:', err);
        }
      }
      if (data.imageUrl && data.imageUrl.includes('urbanautoselection.com')) {
        data.imageUrl = '';
      }
    }
  }
};
