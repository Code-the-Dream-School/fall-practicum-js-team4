const prisma = require("../config/prisma");

const createReport = async (userId, data) => {
  const {
    reportType,
    petType,
    petName,
    breed,
    color,
    size,
    gender,
    distinctiveFeatures,
    eventDate,
    contactInfo,
    location,
    photos,
  } = data;

  const reportData = {
    userId,
    reportType,
    petType,
    petName: petName || null,
    breed: breed || null,
    color,
    size,
    gender,
    distinctiveFeatures: distinctiveFeatures || null,
    eventDate: new Date(eventDate),
    contactInfo: contactInfo || null,
  };

  if (location) {
    reportData.location = {
      create: {
        zipCode: location.zipCode,
        city: location.city,
        state: location.state,
        latitude: location.latitude != null ? location.latitude : null,
        longitude: location.longitude != null ? location.longitude : null,
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