const prisma = require("../config/prisma");

const createReport = async (userId, data) => {
  const { petName, breed, distinctiveFeatures, contactInfo, location, photos, ...rest } = data;

  const reportData = {
    ...rest,
    userId,
    petName: petName || null,
    breed: breed || null,
    distinctiveFeatures: distinctiveFeatures || null,
    contactInfo: contactInfo || null,
  };

  if (location) {
    reportData.location = {
      create: {
        zipCode: location.zipCode,
        city: location.city,
        state: location.state,
        latitude: location.latitude ?? null,
        longitude: location.longitude ?? null,
      },
    };
  }

  if (photos && photos.length > 0) {
    reportData.photos = {
      createMany: {
        data: photos.map((url) => ({ imageUrl: url })),
      },
    };
  }

  return prisma.petReport.create({
    data: reportData,
    include: {
      location: true,
      photos: true,
    },
  });
};

module.exports = {
  createReport,
};
