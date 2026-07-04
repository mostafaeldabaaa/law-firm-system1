// // services/firestoreMessageService.js
// const { getFirestore } = require('../config/firebase');
// const logger = require('../utils/logger');

// /**
//  * بيكتب نسخة "حية" من الرسالة في Firestore بعد ما تتحفظ في MongoDB.
//  * الهدف بس sync لحظي للـ UI، مش تخزين دائم — MongoDB هو المصدر الحقيقي.
//  *
//  * المسار: consultations/{consultationId}/messages/{messageId}
//  */
// const syncMessageToFirestore = async ({
//   consultationId,
//   messageId,
//   senderId,
//   senderName,
//   senderRole,
//   text,
//   createdAt,
// }) => {
//   const db = getFirestore();
//   if (!db) return; // Firebase مش متظبط — تجاهل بهدوء، MongoDB لسه هو المصدر الحقيقي

//   try {
//     await db
//       .collection('consultations')
//       .doc(String(consultationId))
//       .collection('messages')
//       .doc(String(messageId))
//       .set({
//         senderId: String(senderId),
//         senderName: senderName || '',
//         senderRole,
//         text,
//         createdAt: createdAt || new Date().toISOString(),
//       });
//   } catch (err) {
//     // مهم: لو الكتابة في Firestore فشلت، متسقطش الـ request كله.
//     // الرسالة أصلاً محفوظة في MongoDB بنجاح، فده مجرد sync اختياري.
//     logger.error(`Firestore message sync failed: ${err.message}`);
//   }
// };

// /**
//  * بيحدّث حالة الاستشارة في Firestore كمان (اختياري، لو عايز
//  * الـ status يتحدث لحظيًا في الـ UI برضو من غير refresh).
//  */
// const syncConsultationStatusToFirestore = async (consultationId, status) => {
//   const db = getFirestore();
//   if (!db) return;

//   try {
//     await db
//       .collection('consultations')
//       .doc(String(consultationId))
//       .set({ status, updatedAt: new Date().toISOString() }, { merge: true });
//   } catch (err) {
//     logger.error(`Firestore status sync failed: ${err.message}`);
//   }
// };

// module.exports = { syncMessageToFirestore, syncConsultationStatusToFirestore };
// services/firestoreMessageService.js
const { getFirestore } = require('../config/firebase');
const logger = require('../utils/logger');

const syncMessageToFirestore = async ({
  consultationId,
  messageId,
  senderId,
  senderName,
  senderRole,
  text,
  createdAt,
}) => {
  const db = getFirestore();
  if (!db) return;

  try {
    const consultationRef = db.collection('consultations').doc(String(consultationId));
    const timestamp = createdAt || new Date().toISOString();

    // Batch: نكتب الرسالة في الـ subcollection، ونحدّث الـ parent doc
    // بآخر رسالة في نفس الوقت — عشان أي listener على قائمة الاستشارات
    // (list view) يقدر يعرف "فيه رسالة جديدة" من غير ما يحتاج يسمع
    // كل subcollection لوحده (مكلف جدًا مع عدد كبير من الاستشارات).\
    ////////////////git reset --soft HEAD~1
    const batch = db.batch();

    batch.set(consultationRef.collection('messages').doc(String(messageId)), {
      senderId: String(senderId),
      senderName: senderName || '',
      senderRole,
      text,
      createdAt: timestamp,
    });

    batch.set(
      consultationRef,
      {
        lastMessageAt: timestamp,
        lastMessageBy: senderRole,
        lastMessageText: text.slice(0, 200), // preview بس، مش النص كامل
      },
      { merge: true }
    );

    await batch.commit();
  } catch (err) {
    logger.error(`Firestore message sync failed: ${err.message}`);
  }
};

const syncConsultationStatusToFirestore = async (consultationId, status) => {
  const db = getFirestore();
  if (!db) return;

  try {
    await db
      .collection('consultations')
      .doc(String(consultationId))
      .set({ status, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    logger.error(`Firestore status sync failed: ${err.message}`);
  }
};

module.exports = { syncMessageToFirestore, syncConsultationStatusToFirestore };