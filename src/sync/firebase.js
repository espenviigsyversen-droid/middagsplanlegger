export function createRemoteRefs({ db, doc, collection, familyId }) {
  return {
    legacyState: doc(db, "families", familyId, "app", "state"),
    profile: doc(db, "families", familyId, "app", "profile"),
    preferences: doc(db, "families", familyId, "app", "preferences"),
    metadata: doc(db, "families", familyId, "app", "metadata"),
    shopping: doc(db, "families", familyId, "app", "shopping"),
    meals: collection(db, "families", familyId, "meals"),
    weeks: collection(db, "families", familyId, "weeks"),
  };
}

export async function initFirebaseClient(options = {}) {
  const {
    firebaseConfig,
    sdkVersion,
    familyId,
    onAuthReady = async () => {},
  } = options;

  const [{ initializeApp }, authModule, firestoreModule] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-firestore.js`),
  ]);

  const { getAuth, onAuthStateChanged, signInAnonymously } = authModule;
  const { getFirestore, doc, collection, getDoc, getDocs, onSnapshot, setDoc, deleteDoc, serverTimestamp } = firestoreModule;
  const firebaseApp = initializeApp(firebaseConfig);
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);
  const refs = createRemoteRefs({ db, doc, collection, familyId });
  const firestoreApi = { doc, getDoc, getDocs, onSnapshot, setDoc, deleteDoc, serverTimestamp };

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    await onAuthReady({ user, refs, firestoreApi });
  });

  await signInAnonymously(auth);
  return { refs, firestoreApi };
}
