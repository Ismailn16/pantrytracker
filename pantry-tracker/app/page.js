"use client"
import { useState, useEffect } from 'react';
import { Box, Typography, Button, Modal, TextField, Stack } from '@mui/material';
import { GoogleAuthProvider, EmailAuthProvider, onAuthStateChanged, signOut as firebaseSignOut, getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, setDoc, getDocs, deleteDoc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../Firebase'; // Adjust this path to match your Firebase config file
import * as firebaseui from 'firebaseui'; // Import FirebaseUI
import 'firebaseui/dist/firebaseui.css'; // Import FirebaseUI CSS for styling
import axios from 'axios';

export default function Home() {

  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #1d6931',
    boxShadow: 24,
    paddingBottom: 4,
    paddingTop: 2
  };

  const style2 = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #1d6931',
    boxShadow: 24,
    paddingBottom: 4,
    paddingTop: 2,
    paddingLeft: 4,
    paddingRight: 4
  };

  const [user, setUser] = useState(null);
  const [pantry, setPantry] = useState([]);
  const [openSignUp, setOpenSignUp] = useState(false);
  const [openSignIn, setOpenSignIn] = useState(false);
  const handleSignInOpen = () => setOpenSignIn(true);
  const handleSignInClose = () => setOpenSignIn(false);
  const handleSignUpOpen = () => setOpenSignUp(true);
  const handleSignUpClose = () => setOpenSignUp(false);
  const [signOut, setSignOut] = useState(false);
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const [itemName, setItemName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);  // This stores the user object, including the `uid`
        await updatePantry();  // Fetch the user's pantry using their `uid`
      } else {
        setUser(null);  // Reset user when logged out
        setPantry([]);  // Clear pantry if no user is logged in
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // Ensure updatePantry runs when user changes
  useEffect(() => {
    if (user) {
      updatePantry();
    }
  }, [user]);  // Trigger whenever the `user` state changes

  const handleSignUp = async (email, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await createUserDocument(user);  // Link the user to Firestore
      handleSignUpClose(); // Close the modal after success
    } catch (error) {
      console.error("Error signing up:", error.message);
    }
  };

  const [openErrorModal, setOpenErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleErrorModalClose = () => {
    setOpenErrorModal(false);
  };

  // Sign in with Email and Password
  const handleSignIn = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      handleSignInClose(); // Close the modal after success
      await updatePantry(); // Fetch the pantry items immediately after signing in
    } catch (error) {
      console.error("Error signing in:", error.message);
      // Set a custom error message and trigger the error modal
      setErrorMessage("Incorrect email or password. Please try again.");
      setOpenErrorModal(true);
    }
  };
  // Create a Firestore document for the new user
  const createUserDocument = async (user) => {
    const userRef = doc(firestore, 'users', user.uid);

    // Check if the document already exists
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) {
      // If the document doesn't exist, create it with default values
      await setDoc(userRef, {
        email: user.email,
        createdAt: new Date(),
        pantry: []  // Initialize an empty pantry
      });
      console.log("User document created in Firestore");
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth); // Make sure signOut is correctly imported and auth is initialized
      console.log("Sign out successful");
      setEmail(''); // Clear the email field
      setPassword(''); // Clear the password field
      setUser(null); // Update state to reflect the sign-out
    } catch (error) {
      console.error("Sign out error:", error.message);
    }
  };

  const [recipes, setRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);


  useEffect(() => {
    const fetchRecipes = async () => {
      if (pantry.length === 0) {
        console.log("No pantry items to fetch recipes for.");
        return; // Exit early if there are no pantry items
      }

      setLoadingRecipes(true); // Show loading while fetching recipes
      try {
        const res = await fetch('/api/fetch-recipes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pantryItems: pantry.map(item => item.name), // Pass pantry items to the API
          }),
        });

        const data = await res.json();


        if (data && data.recipes) {
          setRecipes(data.recipes); // Update the state with recipes
        } else {
          console.log('No recipes found in the API response.');
        }
      } catch (error) {
        console.error('Error fetching recipes:', error);
      } finally {
        setLoadingRecipes(false);
      }
    };

    // Fetch recipes on the initial load and when pantry updates
    fetchRecipes();
  }, [pantry]); // Run the effect when the pantry array updates or on initial load

  const updatePantry = async () => {
    if (user) {
      try {
        const userPantryRef = collection(firestore, 'users', user.uid, 'pantry');
        const snapshot = await getDocs(userPantryRef);
        const pantryList = [];

        snapshot.forEach((doc) => {
          console.log('Fetched doc:', doc.id, doc.data()); // Log each document
          pantryList.push({ name: doc.id, ...doc.data() });
        });

        console.log('PantryList after fetch:', pantryList); // Log the full pantry list
        setPantry(pantryList); // Set the pantry state
        console.log('Pantry items state after update:', pantryList); // Log the pantry state after setting
        await fetchRecipes(); // Fetch recipes after pantry is updated
      } catch (error) {
        console.error("Error fetching pantry items:", error);
      }
    } else {
      setPantry([]); // Clear pantry if no user is logged in
    }
  };


  const addItem = async (item) => {
    if (!item || item.trim() === "") return;
    const docRef = doc(firestore, 'users', user.uid, 'pantry', item); // Reference user's specific pantry
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const quantity = typeof data.quantity === 'number' ? data.quantity : 0;
      await setDoc(docRef, { quantity: quantity + 1 });
    } else {
      await setDoc(docRef, { quantity: 1 });
    }
    await updatePantry();
  };

  const removeItem = async (item) => {
    const docRef = doc(firestore, 'users', user.uid, 'pantry', item); // Reference user's specific pantry
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const quantity = typeof data.quantity === 'number' ? data.quantity : 1;
      if (quantity === 1) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, { quantity: quantity - 1 });
      }
    }
    await updatePantry();
  };

  useEffect(() => {
    if (openSignUp && typeof window !== 'undefined') {
      setTimeout(() => {
        const container = document.getElementById('firebaseui-auth-container');

        if (container) {
          // FirebaseUI config
          const uiConfig = {
            signInSuccessUrl: user, // Redirect after successful sign-in
            signInOptions: [
              GoogleAuthProvider.PROVIDER_ID,
              EmailAuthProvider.PROVIDER_ID,
            ],
          };

          // Initialize FirebaseUI only if it hasn't been initialized yet
          const ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);

          // Start FirebaseUI in the container
          ui.start('#firebaseui-auth-container', uiConfig);
        }
        else {
          console.error('FirebaseUI container not found');
        }
      }, 0); // Delay to ensure modal opens
    }
    // Clean up FirebaseUI when the modal is closed
    return () => {
      const ui = firebaseui.auth.AuthUI.getInstance();
      if (ui) {
        ui.reset();
      }
    };
  }, [openSignUp, auth]);



  useEffect(() => {
    if (openSignIn && typeof window !== 'undefined') {
      setTimeout(() => {
        const container2 = document.getElementById('firebaseui-auth-container2');

        if (container2) {
          // FirebaseUI config
          const uiConfig = {
            signInSuccessUrl: user, // Redirect after successful sign-in
            signInOptions: [
              GoogleAuthProvider.PROVIDER_ID
            ],
          };

          // Initialize FirebaseUI only if it hasn't been initialized yet
          const ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);

          // Start FirebaseUI in the container
          ui.start('#firebaseui-auth-container2', uiConfig);
        }
        else {
          console.error('FirebaseUI container not found');
        }
      }, 0); // Delay to ensure modal opens
    }
    // Clean up FirebaseUI when the modal is closed
    return () => {
      const ui = firebaseui.auth.AuthUI.getInstance();
      if (ui) {
        ui.reset();
      }
    };
  }, [openSignIn, auth]);


  return (
    <Box width="100vw" height="100vh" display="flex" flexDirection="column" justifyContent="center" alignItems="center">
      {user ? (
        <Box>
          <Box
            width="100vw"
            height="100vh"
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            gap={4}
          >
            <Box border={'1px solid #333'} width="90%" maxWidth="1200px">
              <Box
                width="100%"
                height="100px"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                padding="16px"
                bgcolor={'#1d6931'}
                paddingRight={4}
              >
                <Typography
                  variant="h4"
                  color="white"
                  textAlign="center"
                  paddingLeft={4}
                >
                  Ismail's Pantry Tracking App
                </Typography>

                <Stack direction="row" gap={2}>
                  <Button
                    variant="outlined"
                    onClick={handleOpen}
                    color="inherit"
                    sx={{
                      borderColor: 'white',
                      color: 'white',
                      textTransform: 'none',
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    Add Item
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={handleSignOut}
                    color="inherit"
                    sx={{
                      borderColor: 'white',
                      color: 'white',
                      textTransform: 'none',
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    Sign Out
                  </Button>
                </Stack>
              </Box>

              {/* Updated Stack that takes full width of the container */}
              <Stack
                width="100%"
                height="300px"
                spacing={2}
                overflow="auto"
                padding={2}
                bgcolor="white"
                boxShadow={2}
                borderRadius="0 0 8px 8px"
              >
                {pantry.map((item, index) => (
                  <Stack
                    key={item.name}
                    direction="row"
                    spacing={2}
                    justifyContent="space-between"
                    bgcolor="#f5f5f5"
                    padding={2}
                    borderRadius="8px"
                    width="100%"  // No comment here, just set the width
                  >
                    <Stack>
                      <Typography variant="h5">{item.name}</Typography>
                      <Typography variant="body2">Quantity: {item.quantity ? item.quantity : 1}</Typography>
                    </Stack>

                    <Button variant="contained" color="error" onClick={() => removeItem(item.name)}>
                      Remove Item
                    </Button>
                  </Stack>
                ))}
              </Stack>
            </Box>

            <Modal open={open} onClose={handleClose}>
              <Box sx={style2}>
                <Typography id="modal-modal-title" variant="h6" component="h2">
                  Add Item
                </Typography>
                <Box display="flex" flexDirection="column" alignItems="center" sx={{ mt: 2 }}>
                  <TextField
                    id="outlined-basic"
                    label="Add Item"
                    variant="outlined"
                    sx={{ mb: 2, width: '100%' }}
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                  />
                  <Button
                    variant="outlined"
                    color="success"
                    onClick={() => {
                      addItem(itemName);
                      setItemName('');
                      handleClose();
                    }}
                  >
                    Add
                  </Button>
                </Box>
              </Box>
            </Modal>
            {loadingRecipes ? (
              <Typography>Loading recipe...</Typography>
            ) : (
              <Box width="90%" maxWidth="1200px" bgcolor="#fafafa" padding={4} boxShadow={3} borderRadius="8px">
                <Typography variant="h6" gutterBottom>
                  Recipes Based on Your Pantry:
                </Typography>

                {/* Set a fixed height and enable scrolling */}
                <Box
                  sx={{
                    maxHeight: '600px',  // Adjust the height as needed
                    overflowY: 'auto',   // Enable vertical scrolling
                    padding: 2,
                    bgcolor: 'white',
                    boxShadow: 2,
                    borderRadius: '8px',
                  }}
                >
                  {/* Display each recipe in a scrollable Stack */}
                  {Array.isArray(recipes) && recipes.length > 0 ? (
                    <Stack spacing={4}>
                      {recipes.map((recipe, index) => (
                        <Box
                          key={index}
                          p={3}
                          bgcolor="#fff"
                          borderRadius="8px"
                          boxShadow={1}
                          border="1px solid #e0e0e0"
                        >
                          {/* Show the entire content of the recipe */}
                          <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                            {recipe.content} {/* Display the entire recipe content */}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography>No recipes found</Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </Box>


      ) : (

        <Box width="100vw" height="100vh" display="flex" flexDirection="column" justifyContent="center" alignItems="center" bgcolor={'#c9c8c5'}>
          <Box width="850px" height="400px" display="flex" flexDirection="column" alignItems="center" p={4} bgcolor="background.paper" borderRadius={2} boxShadow={3}>
            <Typography variant="h4" padding={2}>Welcome to Ismail's Pantry Tracking App</Typography>
            <Typography variant='p' padding={2}>Sign in or sign up to unlock the full potential of my Pantry Tracking System!</Typography>
            <Stack
              direction={'row'}
              justifyContent={'space-between'}
              spacing={2}
              gap={2}
              paddingTop={2}
              paddingBottom={2}>
              <Button variant='contained' color='primary' onClick={handleSignUpOpen} >Sign Up</Button>
              <Button variant='contained' color='primary' onClick={handleSignInOpen} >Sign In</Button>
            </Stack>
            <Typography
              textAlign={'center'}
              padding={1}>
              Effortlessly manage and keep track of your pantry inventory, ensuring you always know what's on hand.
            </Typography>
            <Typography
              textAlign={'center'}
              padding={1}>
              Explore personalised recipe suggestions curated by OpenAI GPT, minimising costs and food waste.
            </Typography>
            <Typography
              textAlign={'center'}
              padding={1}>
              Whether you're planning meals or keeping an organised kitchen, we'll help simplify and enhance your culinary experience!
            </Typography>
          </Box>
          <Modal
            open={openSignUp}
            onClose={() => setOpenSignUp(false)}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
          >
            <Box sx={style}>
              <Box
                display={'flex'}
                flexDirection={'reverse-column'}
                alignContent={'center'}
                sx={{ mt: 2 }}
              >
                <Stack
                  gap={2}
                  alignItems={'center'} // Centers the items horizontally
                  width="100%"
                >
                  <Typography id="modal-modal-title" variant="h6" component="h2">
                    Sign Up
                  </Typography>
                  <TextField
                    id="outlined-basic"
                    label="Enter Email"
                    variant="outlined"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <TextField
                    id="outlined-basic"
                    label="Enter Password"
                    variant="outlined"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Box
                    id="firebaseui-auth-container"
                    width="100%"
                    height="auto"
                  >
                    {/* FirebaseUI will be injected here */}
                  </Box>
                  <Button
                    variant="outlined"
                    color="success"
                    onClick={() => handleSignUp(email, password)}
                    sx={{
                      height: 'fit-content',

                    }}
                  >Sign Up</Button>
                </Stack>
              </Box>

            </Box>
          </Modal>

          <Modal
            open={openSignIn}
            onClose={() => setOpenSignIn(false)}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
          >
            <Box sx={style}>
              <Box
                display={'flex'}
                flexDirection={'reverse-column'}
                alignContent={'center'}
                sx={{ mt: 2 }}
              >
                <Stack
                  gap={2}
                  alignItems={'center'} // Centers the items horizontally
                  width="100%"
                >
                  <Typography id="modal-modal-title" variant="h6" component="h2">
                    Sign In
                  </Typography>
                  <TextField
                    id="outlined-basic"
                    label="Enter Email"
                    variant="outlined"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <TextField
                    id="outlined-basic"
                    label="Enter Password"
                    variant="outlined"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Box
                    id="firebaseui-auth-container2"
                    width="100%"
                    height="auto"
                  >
                    {/* FirebaseUI will be injected here */}
                  </Box>
                  <Button
                    variant="outlined"
                    color="success"
                    onClick={() => handleSignIn(email, password)}
                    sx={{
                      height: 'fit-content',

                    }}
                  >Sign In</Button>
                </Stack>
              </Box>

            </Box>
          </Modal>

        </Box>
      )
      }
      <Modal open={openErrorModal} onClose={() => setOpenErrorModal(false)}>
        <Box sx={style2}>
          <Typography variant="h6">Error</Typography>
          <Typography>{errorMessage}</Typography>
          <Button
            variant="contained"
            fullWidth
            onClick={() => setOpenErrorModal(false)}
          >
            Close
          </Button>
        </Box>
      </Modal>
    </Box >
  );
}
