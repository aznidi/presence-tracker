# Confirmation de présence avec Selenium

Prérequis : Node.js 20 ou supérieur, Google Chrome et un accès Internet.

Dans PowerShell :

```powershell
cd C:\selenuim
npm install
npm start
```

Au premier lancement, connectez-vous sur le site dans la fenêtre Chrome ouverte
par Selenium. Aucun identifiant ni mot de passe n'est écrit dans le code.
Le profil local `.browser-profile` conserve la session tant que le site l'autorise.
Si elle expire, reconnectez-vous dans la même fenêtre. Ne lancez qu'une instance
du script à la fois.

Gardez l'onglet sur la page de présence et l'ordinateur éveillé. La surveillance
continue toutes les 250 ms jusqu'à Ctrl+C ou la fermeture du navigateur.
Elle ne recharge pas la page. Une interruption réseau doit être résolue dans
le navigateur ; le script ne peut pas garantir la réception des dialogues hors ligne.

Le script détecte `dialog#check[open] button#confirm`, attend qu'il soit visible
et activé, attend un délai aléatoire de 1 à 3 secondes, puis revérifie le bouton
avant d'effectuer un clic Selenium. Cette pause garde une marge sur le délai
de réponse de 10 secondes. La position n'est pas codée en dur.
Si le bouton bouge pendant le clic, il est recherché à nouveau. Le script attend
la fermeture avant de traiter un nouveau dialogue. Le journal constate cette
fermeture, sans prétendre vérifier l'enregistrement côté serveur.

## Vérification locale

```powershell
npm test
```

Le test ouvre Chrome sans interface sur une page locale : trois apparitions à
des positions aléatoires, bouton recréé et désactivé temporairement. Aucun appel
au site de présence n'est nécessaire pour ce test.

Le HTML de connexion du site n'ayant pas pu être inspecté, la connexion initiale
reste manuelle. Les sélecteurs du dialogue proviennent de la capture fournie.
