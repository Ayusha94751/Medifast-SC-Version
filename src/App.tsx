import { useState, useCallback, useMemo, useEffect } from "react";
import { useUser, useSignIn, useSignUp } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "motion/react";
import { Homepage } from "./components/Homepage";
import { LoginPage } from "./components/LoginPage";
import { RegistrationForm } from "./components/RegistrationForm";
import { PostLoginHomepage } from "./components/PostLoginHomepage";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { PatientDashboard } from "./components/PatientDashboard";
import { ProfessionalPortal } from "./components/ProfessionalPortal";
import { BottomTabBar } from "./components/BottomTabBar";
import { ChatbotWidget } from "./components/ChatbotWidget";
import { TrialAccountBanner } from "./components/TrialAccountBanner";
import { RegisterModal } from "./components/RegisterModal";

// Direct imports for better performance
import { DoctorSearch } from "./components/DoctorSearch";
import { MedicineOrdering } from "./components/MedicineOrdering";
import { LabTestBooking } from "./components/LabTestBooking";
import { EmergencyServices } from "./components/EmergencyServices";
import { MentalHealthSupport } from "./components/MentalHealthSupport";
import { AISymptomChecker } from "./components/AISymptomChecker";
import { YogaExerciseTracker } from "./components/YogaExerciseTracker";
import { NutritionTracker } from "./components/NutritionTracker";
import { PersonalHealthDashboard } from "./components/PersonalHealthDashboard";
import { DoctorDashboard } from "./components/DoctorDashboard";
import { PharmacistDashboard } from "./components/PharmacistDashboard";
import { LabDashboard } from "./components/LabDashboard";
import { AmbulanceDashboard } from "./components/AmbulanceDashboard";
import { SubscriptionPage } from "./components/SubscriptionPage";
import { ChatSupport } from "./components/ChatSupport";
import { ProfileManagement } from "./components/ProfileManagement";

type Screen = "homepage" | "login" | "signup" | "register" | "welcome" | "home" | "doctors" | "medicine" | "lab" | "ambulance" | "mental" | "yoga" | "nutrition" | "notifications" | "profile" | "appointments" | "wellness" | "chat" | "ai-symptom-checker" | "subscription";
type ProfessionalScreen = "professional-portal" | "doctor-dashboard" | "pharmacist-dashboard" | "lab-dashboard" | "ambulance-dashboard";

// Simple transition variants to reduce animation complexity
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

const simpleTransition = { duration: 0.2, ease: "easeOut" };

export default function App() {
  // 🔥 ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP
  
  // Clerk hooks - always called
  const { isSignedIn, user, isLoaded } = useUser();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  // All state hooks - always called
  const [currentScreen, setCurrentScreen] = useState<Screen>("homepage");
  const [professionalScreen, setProfessionalScreen] = useState<ProfessionalScreen | null>(null);
  const [isProfessionalMode, setIsProfessionalMode] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<Screen | null>(null);
  const [isTempAccount, setIsTempAccount] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [userDataComplete, setUserDataComplete] = useState(false);

  // Check if user has complete profile data - always called
  useEffect(() => {
    if (!isSignedIn || !user) return;
    
    // Check if user has completed their profile
    const hasBasicInfo = user.firstName && user.lastName && user.primaryPhoneNumber;
    const hasMetadata = user.publicMetadata?.profileComplete;
    
    setUserDataComplete(hasBasicInfo || hasMetadata);
    
    // Determine if this is a temp account based on sign-up method or metadata
    const isTemp = user.publicMetadata?.accountType === 'temporary' || !hasBasicInfo;
    setIsTempAccount(isTemp);
  }, [isSignedIn, user]);

  // Handle authentication flow and redirects - always called
  useEffect(() => {
    if (!isLoaded) return; // Wait for Clerk to load

    if (isSignedIn && user) {
      // User is signed in, determine where to redirect
      if (pendingNavigation) {
        // User was trying to access a specific feature
        setCurrentScreen(pendingNavigation);
        setPendingNavigation(null);
      } else if (!userDataComplete && currentScreen !== "register") {
        // New user needs to complete registration
        setCurrentScreen("register");
      } else if (currentScreen === "homepage" || currentScreen === "login" || currentScreen === "signup") {
        // Redirect from auth screens to main app
        setCurrentScreen("welcome");
      }
    } else if (!isSignedIn && (currentScreen === "home" || currentScreen === "welcome")) {
      // User signed out, redirect to homepage
      setCurrentScreen("homepage");
    }
  }, [isSignedIn, user, isLoaded, userDataComplete, pendingNavigation, currentScreen]);

  // All useCallback hooks - always called
  const handleLogin = useCallback(async (email: string, password: string) => {
    try {
      if (!signIn) return { success: false, error: "Login not available" };
      
      const result = await signIn.create({
        identifier: email,
        password: password
      });

      if (result.status === "complete") {
        // Login successful - useEffect will handle redirect
        return { success: true };
      } else {
        // Handle additional steps if needed (2FA, etc.)
        return { success: false, error: "Additional verification required" };
      }
    } catch (error: any) {
      return { 
        success: false, 
        error: error.errors?.[0]?.longMessage || "Login failed" 
      };
    }
  }, [signIn]);

  const handleSignup = useCallback(async (email: string, password: string, isSimple: boolean = false) => {
    try {
      if (!signUp) return { success: false, error: "Signup not available" };

      const result = await signUp.create({
        emailAddress: email,
        password: password
      });

      if (result.status === "missing_requirements") {
        // Send verification email
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        return { success: true, needsVerification: true };
      }

      if (result.status === "complete") {
        // Mark as temporary account if it's a simple signup
        if (isSimple && user) {
          await user.update({
            publicMetadata: { 
              accountType: 'temporary',
              signupMethod: 'simple'
            }
          });
        }
        return { success: true };
      }

      return { success: false, error: "Signup incomplete" };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.errors?.[0]?.longMessage || "Signup failed" 
      };
    }
  }, [signUp, user]);

  const handleVerifyEmail = useCallback(async (code: string) => {
    try {
      if (!signUp) return { success: false, error: "Verification not available" };

      const result = await signUp.attemptEmailAddressVerification({ code });
      
      if (result.status === "complete") {
        return { success: true };
      }
      
      return { success: false, error: "Verification failed" };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.errors?.[0]?.longMessage || "Verification failed" 
      };
    }
  }, [signUp]);

  const handleGoToLogin = useCallback(() => {
    setCurrentScreen("login");
  }, []);

  const handleGoToSignup = useCallback(() => {
    setCurrentScreen("signup");
  }, []);

  const handleGoToRegister = useCallback(() => {
    setCurrentScreen("register");
  }, []);

  const handleBackToHomepage = useCallback(() => {
    setCurrentScreen("homepage");
    setIsProfessionalMode(false);
    setProfessionalScreen(null);
  }, []);

  const handleRegistrationComplete = useCallback(async (userData: any) => {
    try {
      if (user) {
        // Update user profile with complete data
        await user.update({
          firstName: userData.firstName,
          lastName: userData.lastName,
          publicMetadata: {
            ...user.publicMetadata,
            profileComplete: true,
            accountType: 'full',
            dateOfBirth: userData.dateOfBirth,
            phone: userData.phone,
            address: userData.address
          }
        });

        setUserDataComplete(true);
        setIsTempAccount(false);
        setShowRegisterModal(false);
        
        if (pendingNavigation) {
          setCurrentScreen(pendingNavigation);
          setPendingNavigation(null);
        } else {
          setCurrentScreen("welcome");
        }
      }
    } catch (error) {
      console.error("Failed to update user profile:", error);
    }
  }, [user, pendingNavigation]);

  const handleNavigation = useCallback((screen: Screen) => {
    setCurrentScreen(screen);
  }, []);

  const handleProfessionalPortalAccess = useCallback(() => {
    setIsProfessionalMode(true);
    setProfessionalScreen("professional-portal");
  }, []);

  const handleSimpleSignupComplete = useCallback(() => {
    setIsTempAccount(true);
  }, []);

  const handleWelcomeComplete = useCallback(() => {
    setCurrentScreen("home");
  }, []);

  const handleOpenRegisterModal = useCallback(() => {
    setShowRegisterModal(true);
  }, []);

  const handleCloseRegisterModal = useCallback(() => {
    setShowRegisterModal(false);
  }, []);

  const handleTrialFeatureAccess = useCallback((featureScreen: Screen) => {
    // For trial users accessing advanced features, show register modal
    if (isTempAccount && ["appointments", "ai-symptom-checker", "wellness"].includes(featureScreen)) {
      setShowRegisterModal(true);
      return;
    }
    setCurrentScreen(featureScreen);
  }, [isTempAccount]);

  const handleNavigateToFeature = useCallback((featureType: string) => {
    const screenMap: Record<string, Screen> = {
      doctors: "doctors",
      medicine: "medicine", 
      lab: "lab",
      ambulance: "ambulance"
    };
    const targetScreen = screenMap[featureType];
    if (targetScreen) {
      if (isSignedIn) {
        setCurrentScreen(targetScreen);
      } else {
        setPendingNavigation(targetScreen);
        setCurrentScreen("signup");
      }
    }
  }, [isSignedIn]);

  const handleProfessionalPortalSelection = useCallback((portal: string) => {
    setProfessionalScreen(portal as ProfessionalScreen);
  }, []);

  const handleBackToProfessionalPortal = useCallback(() => {
    setProfessionalScreen("professional-portal");
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    const screenMap: Record<string, Screen> = {
      home: "home",
      appointments: "appointments", 
      wellness: "wellness",
      chat: "chat",
      profile: "profile"
    };
    const targetScreen = screenMap[tab] || "home";
    
    // Check if trial user is trying to access restricted features
    handleTrialFeatureAccess(targetScreen);
  }, [handleTrialFeatureAccess]);

  // Render functions - defined as regular functions, not hooks
  const renderProfessionalScreen = () => {
    switch (professionalScreen) {
      case "professional-portal":
        return (
          <ProfessionalPortal 
            onSelectPortal={handleProfessionalPortalSelection}
            onBack={handleBackToHomepage} 
          />
        );
      case "doctor-dashboard":
        return <DoctorDashboard onBack={handleBackToProfessionalPortal} />;
      case "pharmacist-dashboard":
        return <PharmacistDashboard onBack={handleBackToProfessionalPortal} />;
      case "lab-dashboard":
        return <LabDashboard onBack={handleBackToProfessionalPortal} />;
      case "ambulance-dashboard":
        return <AmbulanceDashboard onBack={handleBackToProfessionalPortal} />;
      default:
        return (
          <ProfessionalPortal 
            onSelectPortal={handleProfessionalPortalSelection}
            onBack={handleBackToHomepage} 
          />
        );
    }
  };

  const renderScreen = () => {
    const backToHome = () => setCurrentScreen("home");
    
    switch (currentScreen) {
      case "home":
        return <PostLoginHomepage 
          onNavigate={handleNavigation} 
          isTempAccount={isTempAccount}
          onOpenRegisterModal={handleOpenRegisterModal}
        />;
      case "doctors":
        return <DoctorSearch onBack={backToHome} />;
      case "medicine":
        return <MedicineOrdering onBack={backToHome} />;
      case "lab":
        return <LabTestBooking onBack={backToHome} />;
      case "ambulance":
        return <EmergencyServices onBack={backToHome} />;
      case "mental":
        return <MentalHealthSupport onBack={backToHome} />;
      case "ai-symptom-checker":
        return <AISymptomChecker onBack={backToHome} />;
      case "yoga":
        return <YogaExerciseTracker onBack={backToHome} />;
      case "nutrition":
        return <NutritionTracker onBack={backToHome} />;
      case "appointments":
        return <PersonalHealthDashboard 
          onBack={backToHome} 
          onNavigate={handleNavigation}
        />;
      case "subscription":
        return <SubscriptionPage onBack={backToHome} />;
      case "chat":
        return <ChatSupport onBack={backToHome} />;
      case "profile":
        return <ProfileManagement onBack={backToHome} isTempAccount={isTempAccount} />;
      case "notifications":
      case "wellness":
        return (
          <div className="p-6 pt-20 text-center min-h-screen bg-gradient-to-b from-blue-50 to-green-50">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-medium text-gray-900 mb-4">
                {currentScreen === "notifications" && "Notifications"}
                {currentScreen === "wellness" && "Wellness Tracking"}
              </h2>
              <p className="text-gray-600">Coming soon...</p>
            </div>
          </div>
        );
      default:
        return <PatientDashboard onNavigate={handleNavigation} />;
    }
  };

  // useMemo hook - always called, but logic handled inside
  const activeTab = useMemo(() => {
    if (!isSignedIn) return "home"; // Handle condition inside
    
    if (currentScreen === "home") return "home";
    if (currentScreen === "appointments") return "appointments";
    if (["wellness", "mental", "yoga", "nutrition"].includes(currentScreen)) return "wellness";
    if (currentScreen === "chat") return "chat";
    if (currentScreen === "profile") return "profile";
    return "home";
  }, [currentScreen, isSignedIn]);

  // 🔥 NO MORE EARLY RETURNS - All hooks are now called unconditionally above

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle professional portal mode
  if (isProfessionalMode) {
    return (
      <div className="min-h-screen">
        <div>
          {renderProfessionalScreen()}
        </div>
      </div>
    );
  }

  // Handle non-logged-in states
  if (!isSignedIn) {
    switch (currentScreen) {
      case "homepage":
        return (
          <>
            <Homepage 
              onLogin={handleGoToLogin} 
              onRegister={handleGoToSignup}
              onProfessionalPortal={handleProfessionalPortalAccess}
              onNavigateToFeature={handleNavigateToFeature}
            />
            <ChatbotWidget />
          </>
        );
      case "login":
        return (
          <LoginPage 
            onLogin={handleLogin} 
            onSignup={handleGoToSignup}
            onBack={handleBackToHomepage}
            onVerifyEmail={handleVerifyEmail}
          />
        );
      case "signup":
        return (
          <LoginPage 
            onLogin={handleLogin} 
            onSignup={handleSignup}
            onSignupComplete={handleSimpleSignupComplete}
            onBack={handleBackToHomepage}
            onVerifyEmail={handleVerifyEmail}
            isSignupMode={true}
          />
        );
      default:
        return (
          <>
            <Homepage 
              onLogin={handleGoToLogin} 
              onRegister={handleGoToSignup}
              onProfessionalPortal={handleProfessionalPortalAccess}
              onNavigateToFeature={handleNavigateToFeature}
            />
            <ChatbotWidget />
          </>
        );
    }
  }

  // Handle post-login flows for signed-in users
  if (currentScreen === "register") {
    return (
      <RegistrationForm 
        onComplete={handleRegistrationComplete}
        onBack={handleGoToLogin}
        isAfterSimpleSignup={isTempAccount}
        user={user}
      />
    );
  }

  if (currentScreen === "welcome") {
    return <WelcomeScreen onContinue={handleWelcomeComplete} user={user} />;
  }

  // Main logged-in app
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Trial Account Banner - shown on all pages for temp accounts */}
      {isTempAccount && (
        <TrialAccountBanner 
          onRegister={handleOpenRegisterModal}
        />
      )}
      
      <div>
        {renderScreen()}
      </div>
      
      <BottomTabBar 
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      <ChatbotWidget />
      
      {/* Register Modal for trial users */}
      <RegisterModal 
        isOpen={showRegisterModal}
        onClose={handleCloseRegisterModal}
        onComplete={handleRegistrationComplete}
        isTempAccount={isTempAccount}
        user={user}
      />
    </div>
  );
}