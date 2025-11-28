const express = require('express');
const router = express.Router();

const legalPagesContent = [
  {
    slug: "terms-of-service",
    title: "Terms of Service",
    eyebrow: "Conditions d'utilisation",
    updatedAt: "26 novembre 2025",
    intro: "Ces conditions définissent le cadre contractuel entre QrDynamic et les utilisateurs de la plateforme. Merci de les lire attentivement avant d'utiliser nos services.",
    sections: [
      {
        heading: "1. Acceptation des conditions",
        paragraphs: [
          "En accédant à QrDynamic, vous confirmez être majeur(e) et disposer de la capacité légale pour conclure un contrat. Si vous agissez pour le compte d'une organisation, vous garantissez être habilité(e) à engager celle-ci.",
          "L'utilisation continue du service vaut acceptation sans réserve des présentes conditions. Nous pouvons les mettre à jour à tout moment ; la version en ligne fait foi."
        ]
      },
      {
        heading: "2. Description du service",
        paragraphs: [
          "QrDynamic permet de créer et de gérer des mini-sites accessibles via un QR code unique. Les fonctionnalités incluent la personnalisation de contenus, l'hébergement d'actifs, la gestion d'invitations administrateurs et la protection par mot de passe.",
          "Nous faisons de notre mieux pour assurer la disponibilité du service, mais nous ne pouvons pas garantir un fonctionnement ininterrompu. Des opérations de maintenance planifiées ou imprévues peuvent survenir."
        ]
      },
      {
        heading: "3. Comptes et sécurité",
        paragraphs: [
          "Vous êtes responsable de la confidentialité de vos identifiants et de toutes les activités réalisées depuis votre compte.",
          "Merci de nous signaler immédiatement tout accès non autorisé. Nous pouvons suspendre ou clôturer un compte en cas de non-respect des présentes conditions ou de suspicion d'activité frauduleuse."
        ]
      },
      {
        heading: "4. Contenus publiés",
        paragraphs: [
          "Vous conservez la propriété intellectuelle des contenus que vous publiez via QrDynamic. En les diffusant, vous nous accordez une licence limitée pour les héberger et les afficher afin d'assurer le fonctionnement du service.",
          "Vous garantissez disposer de tous les droits nécessaires sur ces contenus et qu'ils respectent la législation applicable ainsi que notre Acceptable Use Policy."
        ]
      },
      {
        heading: "5. Limitation de responsabilité",
        paragraphs: [
          "QrDynamic est fourni « tel quel ». Dans les limites permises par la loi, nous déclinons toute responsabilité pour les pertes indirectes, pertes de données, pertes de profits ou dommages consécutifs liés à l'utilisation du service.",
          "Notre responsabilité totale, si elle est engagée, sera limitée aux frais payés au cours des douze derniers mois, lorsqu'une obligation légale l'exige."
        ]
      },
      {
        heading: "6. Droit applicable",
        paragraphs: [
          "Ces conditions sont régies par le droit français. Tout litige relèvera de la compétence exclusive des tribunaux du ressort de Paris, sous réserve d'une disposition impérative contraire."
        ]
      }
    ]
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    eyebrow: "Politique de confidentialité",
    updatedAt: "26 novembre 2025",
    intro: "Nous protégeons vos données personnelles et expliquons ici quelles informations nous collectons, pourquoi nous les collectons et comment vous pouvez exercer vos droits.",
    sections: [
      {
        heading: "1. Données collectées",
        paragraphs: [
          "Nous collectons les informations fournies lors de la création du compte (nom d'utilisateur, email, mot de passe), les contenus déposés sur vos mini-sites ainsi que les journaux techniques nécessaires à la sécurité (adresses IP, logs d'accès).",
          "Si vous utilisez l'authentification Google, nous recevons les informations de profil que vous autorisez à partager."
        ]
      },
      {
        heading: "2. Finalités du traitement",
        paragraphs: [
          "Gérer votre compte et fournir les services demandés.",
          "Assurer la sécurité, prévenir la fraude et respecter nos obligations légales.",
          "Vous informer des mises à jour importantes relatives au service."
        ]
      },
      {
        heading: "3. Partage des données",
        paragraphs: [
          "Nous ne vendons pas vos données. Elles peuvent être partagées avec des sous-traitants techniques (hébergement, email) strictement nécessaires au fonctionnement du service et soumis à des engagements de confidentialité.",
          "Nous pouvons également divulguer des informations lorsque la loi nous y oblige ou pour faire valoir nos droits."
        ]
      },
      {
        heading: "4. Conservation et sécurité",
        paragraphs: [
          "Les données sont hébergées dans l'Union européenne et conservées pendant la durée d'utilisation du service, puis archivées pour la durée nécessaire au respect d'obligations légales.",
          "Nous appliquons des mesures techniques et organisationnelles adaptées pour protéger vos informations contre la perte, l'accès non autorisé ou la divulgation."
        ]
      },
      {
        heading: "5. Vos droits",
        paragraphs: [
          "Vous disposez des droits d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité. Pour les exercer, contactez-nous à l'adresse privacy@qrdynamic.app.",
          "Vous pouvez également introduire une réclamation auprès de l'autorité de protection des données compétente."
        ]
      }
    ]
  },
  {
    slug: "acceptable-use-policy",
    title: "Acceptable Use Policy",
    eyebrow: "Politique d'utilisation acceptable",
    updatedAt: "26 novembre 2025",
    intro: "Cette politique précise les comportements autorisés et interdits sur QrDynamic afin de préserver un environnement sûr pour tous les utilisateurs.",
    sections: [
      {
        heading: "1. Principes généraux",
        paragraphs: [
          "Votre utilisation doit rester légale, respectueuse et conforme aux finalités du service. Toute tentative d'abus ou de dégradation de l'expérience d'autrui est prohibée."
        ]
      },
      {
        heading: "2. Contenus interdits",
        list: [
          "Contenus illicites, diffamatoires, discriminatoires ou incitant à la haine.",
          "Logiciels malveillants, phishing, collecte non autorisée de données ou liens trompeurs.",
          "Publication d'informations personnelles de tiers sans consentement.",
          "Utilisation pour de la pornographie, du spam massif ou toute activité commerciale trompeuse."
        ]
      },
      {
        heading: "3. Sécurité et intégrité",
        paragraphs: [
          "Il est interdit de tenter d'accéder à des comptes tiers, de contourner les mesures de sécurité ou d'exploiter des failles sans autorisation écrite.",
          "Merci de signaler rapidement toute vulnérabilité découverte à security@qrdynamic.app."
        ]
      },
      {
        heading: "4. Application de la politique",
        paragraphs: [
          "Nous pouvons suspendre ou supprimer tout contenu ou compte qui enfreint cette politique, sans préavis si la gravité le justifie.",
          "Selon les cas, nous pourrons notifier les autorités compétentes."
        ]
      }
    ]
  }
];

legalPagesContent.forEach((page) => {
  router.get(`/${page.slug}`, (req, res) => {
    res.render("legal", { page });
  });
});

module.exports = router;

