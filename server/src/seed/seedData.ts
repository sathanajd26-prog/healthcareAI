import mongoose from 'mongoose';
import { User } from '../models/User';
import { Doctor } from '../models/Doctor';
import { Patient } from '../models/Patient';
import { Appointment } from '../models/Appointment';
import { MedicalRecord } from '../models/MedicalRecord';
import { Prescription } from '../models/Prescription';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hospital_superapp';

export const seedDatabase = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }
    console.log('[Seed] Connected to MongoDB, seeding data...');

    // Clear existing doctors & sample data
    await Doctor.deleteMany({});
    await Appointment.deleteMany({});
    await MedicalRecord.deleteMany({});
    await Prescription.deleteMany({});

    // Create Doctor Users
    const doctorUsers = [
      {
        fullName: 'Dr. Ananya Deshmukh',
        phone: '+919811100001',
        title: 'Dr.',
        avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&auto=format&fit=crop&q=80',
        registrationNumber: 'MCI-84729-KAR',
        registrationCouncil: 'Karnataka Medical Council',
        experienceYears: 14,
        qualifications: [
          { degree: 'MBBS', college: 'AIIMS New Delhi', year: 2010 },
          { degree: 'MD - Cardiology', college: 'PGIMER Chandigarh', year: 2014 },
          { degree: 'FACC (USA)', college: 'American College of Cardiology', year: 2018 },
        ],
        specialties: ['Cardiologist', 'Interventional Cardiology'],
        subSpecialties: ['Heart Failure', 'Coronary Angioplasty', 'Arrhythmia'],
        languagesSpoken: ['English', 'Hindi', 'Kannada'],
        bio: 'Senior Consultant Interventional Cardiologist specializing in preventive heart health, complex coronary interventions, and non-invasive cardiac evaluation with over 14 years of clinical excellence.',
        consultationModes: ['IN_PERSON', 'VIDEO', 'AUDIO'],
        pricing: { inPersonFee: 950, videoFee: 750, homeVisitFee: 2000, currency: 'INR' },
        clinicAffiliations: [
          {
            clinicName: 'Manipal Heart Institute',
            address: 'Old Airport Road, Kodihalli',
            city: 'Bangalore',
            coordinates: [77.6499, 12.9592],
          },
        ],
        verificationStatus: 'VERIFIED',
        ratingAverage: 4.9,
        ratingCount: 342,
        slotDurationMinutes: 20,
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        nextAvailableSlot: 'Today, 03:00 PM',
      },
      {
        fullName: 'Dr. Vikramaditya Rao',
        phone: '+919811100002',
        title: 'Dr.',
        avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80',
        registrationNumber: 'MCI-91283-MH',
        registrationCouncil: 'Maharashtra Medical Council',
        experienceYears: 18,
        qualifications: [
          { degree: 'MBBS', college: 'Grant Medical College', year: 2006 },
          { degree: 'MS - Orthopaedics', college: 'KEM Hospital Mumbai', year: 2010 },
          { degree: 'MCh Ortho', college: 'University of Dundee, UK', year: 2013 },
        ],
        specialties: ['Orthopedic Surgeon', 'Joint Replacement'],
        subSpecialties: ['Robotic Knee Replacement', 'Sports Arthroscopy'],
        languagesSpoken: ['English', 'Hindi', 'Marathi'],
        bio: 'Pioneering robotic joint replacement surgeon with over 3,500 successful surgeries. Known for patient-centric rehabilitation protocols and minimally invasive techniques.',
        consultationModes: ['IN_PERSON', 'VIDEO'],
        pricing: { inPersonFee: 1100, videoFee: 850, homeVisitFee: 2500, currency: 'INR' },
        clinicAffiliations: [
          {
            clinicName: 'Apollo Specialty Ortho Center',
            address: 'Jayanagar 4th Block',
            city: 'Bangalore',
            coordinates: [77.5833, 12.9299],
          },
        ],
        verificationStatus: 'VERIFIED',
        ratingAverage: 4.8,
        ratingCount: 289,
        slotDurationMinutes: 20,
        availableDays: ['Mon', 'Wed', 'Fri'],
        nextAvailableSlot: 'Tomorrow, 10:30 AM',
      },
      {
        fullName: 'Dr. Shalini Swaminathan',
        phone: '+919811100003',
        title: 'Dr.',
        avatarUrl: 'https://images.unsplash.com/photo-1594824813583-a798993f491c?w=500&auto=format&fit=crop&q=80',
        registrationNumber: 'MCI-40192-TN',
        registrationCouncil: 'Tamil Nadu Medical Council',
        experienceYears: 11,
        qualifications: [
          { degree: 'MBBS', college: 'Madras Medical College', year: 2013 },
          { degree: 'MD - Dermatology', college: 'JIPMER Pondicherry', year: 2017 },
        ],
        specialties: ['Dermatologist', 'Cosmetology'],
        subSpecialties: ['Clinical Acne Management', 'Psoriasis & Eczema', 'Laser Therapeutics'],
        languagesSpoken: ['English', 'Tamil', 'Hindi', 'Telugu'],
        bio: 'Passionate dermatologist combining evidence-based medical dermatology with modern skin rejuvenation. Dedicated to safe, holistic treatment of chronic skin conditions.',
        consultationModes: ['IN_PERSON', 'VIDEO', 'HOME_VISIT'],
        pricing: { inPersonFee: 800, videoFee: 600, homeVisitFee: 1800, currency: 'INR' },
        clinicAffiliations: [
          {
            clinicName: 'Aura Skin & Hair Clinic',
            address: 'Indiranagar 100ft Road',
            city: 'Bangalore',
            coordinates: [77.6412, 12.9719],
          },
        ],
        verificationStatus: 'VERIFIED',
        ratingAverage: 4.9,
        ratingCount: 412,
        slotDurationMinutes: 15,
        availableDays: ['Tue', 'Thu', 'Sat', 'Sun'],
        nextAvailableSlot: 'Today, 05:45 PM',
      },
      {
        fullName: 'Dr. Rohan Mehra',
        phone: '+919811100004',
        title: 'Dr.',
        avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=500&auto=format&fit=crop&q=80',
        registrationNumber: 'MCI-62910-DEL',
        registrationCouncil: 'Delhi Medical Council',
        experienceYears: 12,
        qualifications: [
          { degree: 'MBBS', college: 'Maulana Azad Medical College', year: 2012 },
          { degree: 'MD - Pediatrics', college: 'Lady Hardinge Medical College', year: 2016 },
        ],
        specialties: ['Pediatrician', 'Child Wellness'],
        subSpecialties: ['Neonatal Care', 'Childhood Asthma', 'Vaccination Specialist'],
        languagesSpoken: ['English', 'Hindi', 'Punjabi'],
        bio: 'Gentle and trusted child specialist helping parents navigate newborn care, immunization milestones, and pediatric respiratory conditions with utmost compassion.',
        consultationModes: ['IN_PERSON', 'VIDEO'],
        pricing: { inPersonFee: 750, videoFee: 550, homeVisitFee: 1500, currency: 'INR' },
        clinicAffiliations: [
          {
            clinicName: 'Little Steps Children Clinic',
            address: 'Koramangala 5th Block',
            city: 'Bangalore',
            coordinates: [77.6208, 12.9352],
          },
        ],
        verificationStatus: 'VERIFIED',
        ratingAverage: 4.9,
        ratingCount: 512,
        slotDurationMinutes: 15,
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        nextAvailableSlot: 'Today, 04:15 PM',
      },
      {
        fullName: 'Dr. Kabir Sen',
        phone: '+919811100005',
        title: 'Dr.',
        avatarUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=500&auto=format&fit=crop&q=80',
        registrationNumber: 'MCI-55092-WB',
        registrationCouncil: 'West Bengal Medical Council',
        experienceYears: 16,
        qualifications: [
          { degree: 'MBBS', college: 'Calcutta National Medical College', year: 2008 },
          { degree: 'MD - General Medicine', college: 'IPGMER Kolkata', year: 2012 },
        ],
        specialties: ['General Physician', 'Internal Medicine'],
        subSpecialties: ['Diabetology', 'Hypertension & Lifestyle Disorders', 'Geriatric Care'],
        languagesSpoken: ['English', 'Bengali', 'Hindi'],
        bio: 'Comprehensive internal medicine physician focusing on preventive wellness, chronic diabetes reversal programs, and holistic adult care.',
        consultationModes: ['IN_PERSON', 'VIDEO', 'AUDIO', 'HOME_VISIT'],
        pricing: { inPersonFee: 600, videoFee: 450, homeVisitFee: 1200, currency: 'INR' },
        clinicAffiliations: [
          {
            clinicName: 'Fortis Health Center',
            address: 'Bannerghatta Main Road',
            city: 'Bangalore',
            coordinates: [77.5975, 12.8932],
          },
        ],
        verificationStatus: 'VERIFIED',
        ratingAverage: 4.7,
        ratingCount: 198,
        slotDurationMinutes: 15,
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        nextAvailableSlot: 'Today, 06:00 PM',
      },
    ];

    for (const d of doctorUsers) {
      let user = await User.findOne({ phone: d.phone });
      if (!user) {
        user = await User.create({
          phone: d.phone,
          fullName: d.fullName,
          role: 'DOCTOR',
          isVerified: true,
          permissions: ['doctor:read', 'doctor:write', 'prescription:create'],
        });
      }

      await Doctor.create({
        ...d,
        userId: user._id,
      });
    }

    console.log('[Seed] Doctors seeded successfully!');
  } catch (error) {
    console.error('[Seed] Error seeding data:', error);
  }
};

// Execute if run directly via ts-node
if (require.main === module) {
  seedDatabase().then(() => {
    console.log('[Seed] Completed! Exiting.');
    process.exit(0);
  });
}
