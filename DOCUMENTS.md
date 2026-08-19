## Coding style guide
### Using Pusher/channel

We're using Pusher/channel to push a message from server to client. For instance:
- When a user type a new comment, the other user will receive this comment immediately.
- Or when a new user was added to a new project, he/she will be see it right after the manager update member list

To use it, in your backend code, import the `pusherTrigger` and trigger an event as follows:
```javascript
import { pusherTrigger } from '../../lib/pusher-server'

const eventName = `event-delete-task-comment`

pusherTrigger('team-collab', eventName, {
    id,
    triggerBy: updatedBy
})
```

Next, on the client side, create a new file in format as follow `ui-app/app/_events/useEvent<event-name>.ts`
```javascript
// ui-app/app/_events/useEventDeleteComment.ts

import { usePusher } from './usePusher' // search usePusher in /ui-app

export const useEventDeleteComment = () => {

  useEffect(() => {
    const eventName = `event-delete-task-comment`

    channelTeamCollab &&
      channelTeamCollab.bind(eventName, (data) => {
        console.log(data)
      })

    return () => {
      channelTeamCollab && channelTeamCollab.unbind(eventName)
    }
  }, [channelTeamCollab])
}
```

## Create a task scheduler

To run a task in schedule, for example: run a task per 1h, run a task per Monday at 20h
Do the following steps:

### Step 1 - Create an event in backend
Open `apps/backend/src/events/index.ts` then create an event name and add a handler to it.

```typescript

export const CHANNEL_DAY_STATS = 'stats:day-stats'

// We must subscribe channels first
redis.subscribe(CHANNEL_DAY_STATS)

// After that, we can listen messages from them
redis.on('message', async (channel: string, data: string) => {
    if (channel === CHANNEL_DAY_STATS) {
      const dayStats = new StatsByDayEvent()
      dayStats.run()
    }
})
```

Next, create the event handler at `apps/backend/src/events/` folder. Ex: `stats.day.event.ts`
```typescript
export default class StatsByDayEvent {
  constructor() {

  }
  async run() {

  }
}
```

### Step 2 - Publish to the above event
After registering event we need to publish message to trigger it. Open `packages/task-runner/src/main.ts` and create a cronjob as follows

```typescript
connectPubClient((err, redis) => {
  if (err) return

  // run every 20pm
  const runAt20h = 'runAt20pm'
  cronJob.create(runAt20h, '5 12,20 * * *', () => {

    // Remember that, channel name must be same as Event name
    const CHANNEL_DAY_STATS = 'stats:day-stats'
    redis.publish(CHANNEL_DAY_STATS, 'heelo')
  })
})

```



## Configure environment variables
### Required configs
|Name|Value|Desc|Required|
|-|-|-|-|
|NEXT_PUBLIC_FE_GATEWAY|http://localhost:4200/|Frontend url|✔️|
|NEXT_PUBLIC_BE_GATEWAY|http://localhost:3333/|Backend api url|✔️|
|NEXT_PUBLIC_APP_NAME|Namviek Dev|App name|✔️|
|MONGODB_URL|mongodb+srv://<user>:<pass>@<host>/<db>?retryWrites=true&w=majority|Database uri|✔️|
|JWT_SECRET_KEY|12GUY3N76U21d4IJ|Secret key|✔️|
|JWT_REFRESH_KEY|7us9s88o121ieeuo|Refresh key|✔️|
|JWT_VERIFY_USER_LINK_TOKEN_EXPIRED|1h|Expired time|✔️|
|JWT_TOKEN_EXPIRED|30m|Expired time|✔️|
|JWT_REFRESH_EXPIRED|4h|Expired time|✔️|
|REDIS_HOST||Redis host|✔️|

### Configure Email notification and Storage
|Name|Value|Desc|Required|
|-|-|-|-|
|RESEND_TOKEN||Token for sending email. Visit: https://resend.com||
|RESEND_EMAIL_DOMAIN|namviek.com|Email Domain||
|AWS_ACCESS_KEY||AWS s3 access key||
|AWS_SECRET_ACCESS_KEY||AWS s3 secret key||
|AWS_REGION|ap-southeast-1|Aws region||
|AWS_S3_BUCKET|kampunistore|Aws bucket name||

### Configure Push notification using Pusher.js
|Name|Value|Desc|Required|
|-|-|-|-|
|NEXT_PUBLIC_PUSHER_INSTANCE_ID||Pusher beam instance id||
|PUSHER_INSTANCE_ID||Pusher beam instance id||
|PUSHER_SECRET_KEY||Pusher beam secret key||
|NEXT_PUBLIC_PUSHER_CHANNEL_APP_KEY||Push channel app key||
|NEXT_PUBLIC_PUSHER_CHANNEL_APP_CLUSTER|ap1|Pusher channel app cluster||
|PUSHER_CHANNEL_APP_ID|1710577|Pusher channel app id||
|PUSHER_CHANNEL_SECRET||Pusher channel secret||

### Configure Livekit for online meeting
|Name|Value|Desc|Required|
|-|-|-|-|
|LIVEKIT_API_KEY|ANSWjslSNAwexMy|Livekit api key||
LIVEKIT_API_SECRET||Livekit api secret||
NEXT_PUBLIC_LIVEKIT_URL|wss://namviek-hmunmehy.livekit.cloud|Livekit url||

### Configure log server
|Name|Value|Desc|Required|
|-|-|-|-|
|AXIOM_DATASET|namviek|Axiom dataset name||
|AXIOM_TOKEN|namviek|Axiom token||

### Configure Firebase for Google Sign-In and Email Verification

Google Sign-In uses Firebase Authentication on the web client (Next.js) and Firebase Admin SDK on the backend (Express API).

#### 1. Setup Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project (or select an existing one).
2. Under **Build > Authentication**, click **Get Started** and enable **Google** in the **Sign-in method** tab.
3. Add your authorized domains under Authentication Settings (e.g., `localhost` for local development, and your production domain).

#### 2. Configure Web App (Frontend)
1. In Project Settings > **General**, scroll to **Your apps** and click the Web icon (`</>`) to register a Web App.
2. Copy the `firebaseConfig` object and stringify it into `NEXT_PUBLIC_FIREBASE_CLIENT_CONFIG`:
```json
NEXT_PUBLIC_FIREBASE_CLIENT_CONFIG='{"apiKey":"AIzaSy...","authDomain":"your-app.firebaseapp.com","projectId":"your-app","storageBucket":"your-app.appspot.com","messagingSenderId":"123456","appId":"1:123456:web:abcdef"}'
```

#### 3. Configure Service Account (Backend)
1. In Project Settings > **Service accounts**, click **Generate new private key**.
2. Download the JSON file and extract the following credentials into your `.env`:

| Name | Value | Desc | Required |
|---|---|---|---|
| `FIREBASE_PROJECT_ID` | `your-project-id` | Firebase project ID | Optional (required for Google Auth) |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com` | Service account client email | Optional (required for Google Auth) |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\nMIIE...` | Service account private key | Optional (required for Google Auth) |
| `NEXT_PUBLIC_FIREBASE_CLIENT_CONFIG` | `'{"apiKey":"...","projectId":"..."}'` | Client SDK config JSON | Optional (required for Google Auth) |

