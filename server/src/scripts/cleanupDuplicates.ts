import mongoose from 'mongoose';
import { Doctor } from '../models/Doctor';
import { User } from '../models/User';
import { Patient } from '../models/Patient';
import { Appointment } from '../models/Appointment';
import { MedicalRecord } from '../models/MedicalRecord';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hospital_superapp';

export const runSafeCleanup = async (): Promise<{
  deletedTestDoctors: number;
  deletedTestUsers: number;
  deletedTestAppointments: number;
  updatedShaliniAvatar: boolean;
  remainingDoctors: number;
}> => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
  }

  console.log('[Cleanup] Connected to MongoDB for safe doctor cleanup...');

  // 1. Identify synthetic test doctors (REG-ST4-*)
  const testDoctors = await Doctor.find({
    $or: [
      { registrationNumber: /^REG-ST4-/ },
      { fullName: 'Dr. Real Stage4 Specialist' },
    ],
  });

  console.log(`[Cleanup] Found ${testDoctors.length} synthetic test doctor record(s) to remove.`);

  const testDoctorIds = testDoctors.map((d) => d._id);
  const testDoctorUserIds = testDoctors.map((d) => d.userId).filter(Boolean);

  // 2. Identify synthetic test patients (Real Stage4 Patient)
  const testPatients = await Patient.find({ fullName: 'Real Stage4 Patient' });
  const testPatientIds = testPatients.map((p) => p._id);
  const testPatientUserIds = testPatients.map((p) => p.userId).filter(Boolean);

  // 3. Remove synthetic test appointments tied to these test entities
  const apptResult = await Appointment.deleteMany({
    $or: [
      { doctorId: { $in: testDoctorIds } },
      { patientName: 'Real Stage4 Patient' },
    ],
  });
  console.log(`[Cleanup] Cleaned up ${apptResult.deletedCount} synthetic test appointment(s).`);

  // 4. Remove synthetic test medical records
  await MedicalRecord.deleteMany({
    $or: [
      { doctorId: { $in: testDoctorIds } },
      { patientId: { $in: testPatientIds } },
      { title: 'Comprehensive Lipid & Glycemic Panel' },
    ],
  });

  // 5. Delete synthetic test doctors
  const docResult = await Doctor.deleteMany({ _id: { $in: testDoctorIds } });
  console.log(`[Cleanup] Deleted ${docResult.deletedCount} synthetic test doctor document(s).`);

  // 6. Delete synthetic test patient documents
  await Patient.deleteMany({ _id: { $in: testPatientIds } });

  // 7. Delete synthetic test users
  const userResult = await User.deleteMany({
    _id: { $in: [...testDoctorUserIds, ...testPatientUserIds] },
  });
  console.log(`[Cleanup] Deleted ${userResult.deletedCount} synthetic test user(s).`);

  // 8. Update Dr. Shalini Swaminathan's image URL if invalid/broken
  const validShaliniAvatar = 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=500&auto=format&fit=crop&q=80';
  const shaliniUpdate = await Doctor.updateOne(
    { registrationNumber: 'MCI-40192-TN' },
    { $set: { avatarUrl: validShaliniAvatar } }
  );
  console.log(`[Cleanup] Updated Dr. Shalini Swaminathan profile image URL: ${shaliniUpdate.modifiedCount > 0 ? 'SUCCESS' : 'ALREADY CURRENT'}`);

  // 9. Verify remaining doctor count
  const remainingDoctors = await Doctor.find({});
  console.log(`[Cleanup] Safe cleanup finished. Remaining verified doctors: ${remainingDoctors.length}`);
  remainingDoctors.forEach((d) => {
    console.log(` - ${d.fullName} (${d.registrationNumber}) [${d.specialties.join(', ')}]`);
  });

  return {
    deletedTestDoctors: docResult.deletedCount || 0,
    deletedTestUsers: userResult.deletedCount || 0,
    deletedTestAppointments: apptResult.deletedCount || 0,
    updatedShaliniAvatar: shaliniUpdate.modifiedCount > 0,
    remainingDoctors: remainingDoctors.length,
  };
};

if (require.main === module) {
  runSafeCleanup()
    .then((results) => {
      console.log('[Cleanup] Result summary:', results);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Cleanup] Error during safe cleanup:', err);
      process.exit(1);
    });
}
