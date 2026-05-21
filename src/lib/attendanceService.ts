import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface AttendanceRecord {
  userId: string;
  userName: string;
  userType: string;
  groupId: string;
  groupName: string;
  meetLink: string;
  sessionId?: string;
}

export const logAttendance = async (record: AttendanceRecord) => {
  try {
    await addDoc(collection(db, 'attendance'), {
      ...record,
      timestamp: serverTimestamp()
    });
    console.log('Attendance logged successfully');
    
    // Open the meet link in a new tab
    if (record.meetLink) {
      window.open(record.meetLink, '_blank');
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'attendance');
  }
};
