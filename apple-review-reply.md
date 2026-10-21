# Apple App Review cevabı – Gunes English School 1.0

App Store Connect → Resolution Center'da rejection mesajına cevap olarak yapıştır.
Göndermeden önce: (1) App Privacy etiketini düzelt, (2) yeni build'i (1.0 (3)) gerçek iPad'de test edip yükle.

---

Hello App Review Team,

Thank you for your review. Please find our responses below.

**Guideline 2.1(a) – Performance (crash when capturing a photo)**

The crash was caused by a missing camera usage description in the app's Info.plist. When a user chose "Take Photo" from an image upload field, iOS terminated the app. We have added NSCameraUsageDescription, NSPhotoLibraryUsageDescription and NSMicrophoneUsageDescription with clear explanations, and tested photo capture and photo library selection on iPad and iPhone. The fix is included in build 1.0 (3).

**Guideline 5.1.2(i) – Privacy – Data Use and Sharing**

The app does not track users. Email address and phone number are collected only to create and manage the student's school account and to communicate about lessons. This data is not linked with third-party data for advertising and is not shared with data brokers. The app contains no advertising or analytics SDKs. We have corrected the App Privacy information in App Store Connect so that these data types are no longer marked as used for tracking.

**Guideline 2.1(b) – Information Needed (business model)**

1. **Who are the users that will use the paid subscriptions and services in the app?**
   The users are students who are enrolled at Gunes English School, a language school, and the school's own staff (teachers and administrators). The app works as the school's student portal and school management tool.

2. **Where can users purchase the subscriptions and services that can be accessed in the app?**
   Students enroll and pay directly with the school, outside the iOS app: in person at the school, by bank transfer, or on the school's website. The iOS app offers no way to purchase anything. It shows no prices, no purchase buttons, and no links or calls to action to purchase elsewhere.

3. **What specific types of previously purchased subscriptions and services can a user access in the app?**
   Enrolled students can view the course packages assigned to their account by the school. These are live online group English classes taught in real time by the school's teachers. In the app, students can see their lesson schedule, join their scheduled live classes, check attendance, access course materials, and view their invoices.

4. **What paid content, subscriptions, or features are unlocked within the app that do not use In-App Purchase?**
   Nothing is sold or unlocked through a purchase inside the iOS app. Access to the student portal is set up by the school when a student enrolls.

5. **Can users purchase physical goods or services together with digital content in your app?**
   No. The app does not sell physical goods, and it does not sell any bundles of physical and digital content.

**Review Notes / demo account**

A demo student account is provided in the App Review Information section, so you can review the student portal.

Thank you,
Gunes English School
