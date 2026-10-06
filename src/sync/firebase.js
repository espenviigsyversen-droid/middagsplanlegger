export function createRemoteRefs({ db, doc, collection, familyId }) {
  return {
    meta: doc(db, "families", familyId, "app", "meta"),
    members: collection(db, "families", familyId, "members"),
    profile: doc(db, "families", familyId, "app", "profile"),
    preferences: doc(db, "families", familyId, "app", "preferences"),
    metadata: doc(db, "families", familyId, "app", "metadata"),
    shopping: doc(db, "families", familyId, "app", "shopping"),
    shoppingItems: collection(db, "families", familyId, "shoppingItems"),
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

  const { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } = authModule;
  const { getFirestore, doc, collection, getDoc, getDocs, getDocFromServer, getDocsFromServer, onSnapshot, setDoc, updateDoc, runTransaction, deleteDoc, serverTimestamp } = firestoreModule;
  const firebaseApp = initializeApp(firebaseConfig);
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);
  const refs = createRemoteRefs({ db, doc, collection, familyId });
  const firestoreApi = { doc, getDoc, getDocs, getDocFromServer, getDocsFromServer, onSnapshot, setDoc, updateDoc, deleteDoc, serverTimestamp,
    runTransaction: (callback) => runTransaction(db, callback),
  };

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const connection = { firebaseApp, refs, firestoreApi,
    signIn: () => signInWithPopup(auth, provider),
    signOut: () => signOut(auth),
  };
  connection.unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    Promise.resolve(onAuthReady({ ...connection, user })).catch(options.onAuthError || (() => {}));
  }, options.onAuthError);
  return connection;
}
