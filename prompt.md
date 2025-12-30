# API caméra

PWA caméra surveillance en temps réel + notif.
Langage: react

## init project

packages nodeJS pour :

- gestion .env

C'est une PWA qui doit être responsive prioritairement.
auth par token
utilisation d'une API key
tu peux installer des pacages via npm
tu peux utiliser vite

## Features

### Feature login

Pouvoir me connecter par champs email + mdp.

```json
POST {{baseUrl}}/auth/login
Content-Type: application/json
X-API-Key: {{apiKey}}

{
  "email": "augustin@test.com",
  "password": "Password123"
}
```

response:

```http
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 297
ETag: W/"129-0vbqKmMxTXQxJSOWgmUICXOT21I"
Date: Tue, 30 Dec 2025 09:56:36 GMT
Connection: close

{
  "message": "Connexion réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhdWd1c3RpbkB0ZXN0LmNvbSIsImlhdCI6MTc2NzA4ODU5NiwiZXhwIjoxNzY3MTc0OTk2fQ.CuuEYJpANdWTDu4SdGeKQ2LvlyAtElRpbH9T6XnOfag",
  "user": {
    "id": 1,
    "lastname": "Seguin",
    "firstname": "Augustin",
    "email": "augustin@test.com"
  }
}
```

mets en cache les données (token)
et mets en cache les données (user)

### Feature home

En tant qu'utilisateur connecté, je peux accéder à l'écran d'accueil (/home)
et avoir le choix entre 3 actions possibles (4 boutons)

- se déconnecter
- se ajouter une camera (liste de camera)
- se connecter à une camera

d'abord je veux un message avec écris "Bonjour {user.firstname}

pour se connecter à une camera, on va lister les cameras.
Si l'utilisateur a 3 cameras par exemple, on fait 2 blocs de 2 cameras (la 2e ligne n'aura qu'une camera).
Ce qui veut dire qu'il faut appeler la route :

```http
### Récupérer mes caméras (nécessite JWT)
GET {{baseUrl}}/cameras/my-cameras
Authorization: Bearer {{token}}
X-API-Key: {{apiKey}}
```

reponse :

```http
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 127
ETag: W/"7f-VlMNTSA93iPRYq6xmOHXP8mzeiI"
Date: Tue, 30 Dec 2025 09:57:40 GMT
Connection: close

{
  "cameras": [
    {
      "id": 1,
      "lastname": "Caméra Salon",
      "cam_key": "cam_esp32_001"
    },
    {
      "id": 2,
      "lastname": "Caméra Salon",
      "cam_key": "cam_esp32_002"
    }
  ]
}
```

mets les en cache stp.

a coté de chacune des cameras, je veux que tu rajoutes une petite corbeille.

je veux pouvoir telecharger l'app (c'est une **PWA**). cf wireframe

wireframe de la view home en PJ du prompt.

### Feature déconnexion

En tant qu'utilisateur connecté, je souhaite pouvoir me déconnecter afin de fermer ma session.
=> route /logout
=> supprime le token actuel & tout cache

### Feature add camera

En tant qu'utilisateur connecté, je souhaite ajouter une caméra.

il faut donc un formulaire.

route a appeler :

```http
### Créer une nouvelle caméra (nécessite JWT + API Key)
POST {{baseUrl}}/cameras/create
Content-Type: application/json
Authorization: Bearer {{token}}
X-API-Key: {{apiKey}}

{
  "lastname": "Caméra Salon",
  "cam_key": "{{camKey}}"
}
```

reponse :

```http
HTTP/1.1 201 Created
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 108
ETag: W/"6c-d6mmvwHavVnK29rSZD5GnRynOWU"
Date: Tue, 30 Dec 2025 09:57:17 GMT
Connection: close

{
  "message": "Caméra créée avec succès",
  "camera": {
    "id": 2,
    "lastname": "Caméra Salon",
    "cam_key": "cam_esp32_002"
  }
}
```

je dois pouvoir revenir en arrière (bouton fleche retour en arriere a ajouter en haut à gauche)

### Feature delete camera

En tant qu'utilisateur connecté, je souhaite supprimer une de mes caméra.

route a appeler :

```http
### Supprimer une caméra (nécessite JWT + API Key)
DELETE {{baseUrl}}/cameras/1
Authorization: Bearer {{token}}
X-API-Key: {{apiKey}}
```

reponse :

```http
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 111
ETag: W/"6f-OiiWVCdgNyqXUFGw7Q9tlVR+0UE"
Date: Tue, 30 Dec 2025 09:58:14 GMT
Connection: close

{
  "message": "Caméra supprimée avec succès",
  "camera": {
    "id": 1,
    "lastname": "Caméra Salon",
    "cam_key": "cam_esp32_001"
  }
}
```

cette action est accessible depuis la petite corbeille à côté de chaque camera de la page home.
quand on clic sur la corbeiolle de la camera a l'id 1 par exemple il faut une pop de confirmation.

### Feature notifications

notification en temps reel.
l'api utilise socket.io

doc de mon api :

````
## � Notifications en temps réel (WebSocket)

L'API utilise **Socket.IO** pour envoyer des notifications en temps réel aux utilisateurs connectés.

### Connexion au WebSocket

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  auth: {
    token: "votre_jwt_token", // Token obtenu via /auth/login
  },
});

// Connexion réussie
socket.on("connect", () => {
  console.log("Connecté au serveur WebSocket");
});

// Recevoir les notifications
socket.on("notification", (data) => {
  console.log("Nouvelle notification:", data);
  // {
  //   camKey: "cam_esp32_001",
  //   id: 1,
  //   type: "motion",
  //   message: "Mouvement détecté",
  //   cameraName: "Caméra Salon",
  //   createdAt: "2024-12-13T10:30:00.000Z",
  //   receivedAt: "2024-12-13T10:30:00.123Z"
  // }
});

// Erreur de connexion
socket.on("connect_error", (error) => {
  console.error("Erreur de connexion:", error.message);
});
````

### Événements disponibles

| Événement            | Direction        | Description                              |
| -------------------- | ---------------- | ---------------------------------------- |
| `notification`       | Serveur → Client | Nouvelle notification reçue              |
| `subscribe:camera`   | Client → Serveur | S'abonner aux notifications d'une caméra |
| `unsubscribe:camera` | Client → Serveur | Se désabonner d'une caméra               |

### S'abonner/Désabonner manuellement

```javascript
// S'abonner à une caméra spécifique
socket.emit("subscribe:camera", "cam_esp32_002");

// Se désabonner
socket.emit("unsubscribe:camera", "cam_esp32_002");
```

> 📌 À la connexion, l'utilisateur est automatiquement abonné à toutes ses caméras (via la table `user_cameras`).

````

la partir init et subscrption des notifs se fait quand on arrive sur la home.
(donc juste après avoir récupérer les cameras de l'utilisaeur authentifié)

### Feature stream

pour la route stream c'est donc au clic sur une camera :

```http
### Flux vidéo en temps réel (nécessite API Key)
GET {{baseUrl}}/cameras/video/{{camKey}}
X-API-Key: {{apiKey}}
```http

### repo

- genere le readme
- genere le .gitignore

````


## Fix 

- migrer en typescript
- Formulaire de login: pouvoir afficher le mot de passe qu'on rentre (utilisation d'un oeil pour afficher / masquer le champs mdp)
- view steam => suppriemr l'option audio (il n'y a pas d'audio)

- pwa => rajouter du bouton "télécharger l'application PWA"
- demande d'autorisation aux notifications 
