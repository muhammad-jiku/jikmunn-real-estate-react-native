import { openAuthSessionAsync } from 'expo-web-browser';
import { Platform } from 'react-native';
import {
  Account,
  Avatars,
  Client,
  Databases,
  OAuthProvider,
  Query,
  Storage,
} from 'react-native-appwrite';

export const config = {
  platform: process.env.EXPO_PUBLIC_APPWRITE_PLATFORM,
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_API_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DB_ID,
  galleriesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_DB_GALLERIES_COLLECTION_ID,
  reviewsCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_DB_REVIEWS_COLLECTION_ID,
  agentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_DB_AGENTS_COLLECTION_ID,
  propertiesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_DB_PROPERTIES_COLLECTION_ID,
  bucketId: process.env.EXPO_PUBLIC_APPWRITE_DB_STORAGE_BUCKET_ID,
};

export const client = new Client();
client
  .setEndpoint(config.endpoint!)
  .setProject(config.projectId!)
  .setPlatform(config.platform!);

export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export async function login() {
  try {
    let redirectUri;
    console.log('platform..', Platform);
    console.log('window location ..', window.location);
    // Handle different environments
    if (Platform.OS === 'web') {
      // For web platform, use standard web URL
      redirectUri = window.location.origin;
    } else {
      // For mobile platforms (React Native)
      if (__DEV__) {
        // Get the Expo development URL - this must match what's in your Appwrite console
        // The IP and port should match your dev server
        redirectUri = 'exp://192.168.68.204:8081/--/';
      } else {
        // For production builds - must match URL scheme in app.json
        redirectUri = 'jikmunn-real-estate://';
      }
    }

    console.log('redirect uri...', redirectUri);

    const response = await account.createOAuth2Token(
      OAuthProvider.Google,
      redirectUri
    );

    console.log('response...', response);
    if (!response) throw new Error('Create OAuth2 token failed!');

    // Handle different authentication flows based on platform
    if (Platform.OS === 'web') {
      // For web, typically redirect directly
      window.location.href = response.href;
      return true; // This line may not be reached due to redirect
    } else {
      // For mobile, use the web browser session approach
      const browserResult = await openAuthSessionAsync(
        response.href.toString(),
        redirectUri
      );

      console.log(browserResult);

      if (browserResult.type !== 'success')
        throw new Error('Create OAuth2 token failed');

      const url = new URL(browserResult.url);
      const secret = url.searchParams.get('secret')?.toString();
      const userId = url.searchParams.get('userId')?.toString();
      if (!secret || !userId) throw new Error('Create OAuth2 token failed');

      const session = await account.createSession(userId, secret);
      if (!session) throw new Error('Failed to create session');
    }

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function logout() {
  try {
    const result = await account.deleteSession('current');
    return result;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function getCurrentUser() {
  try {
    const result = await account.get();
    if (result.$id) {
      const userAvatar = avatar.getInitials(result.name);

      return {
        ...result,
        avatar: userAvatar.toString(),
      };
    }

    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function getLatestProperties() {
  try {
    const result = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!,
      [Query.orderAsc('$createdAt'), Query.limit(5)]
    );

    return result.documents;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getProperties({
  filter,
  query,
  limit,
}: {
  filter: string;
  query: string;
  limit?: number;
}) {
  try {
    const buildQuery = [Query.orderDesc('$createdAt')];

    if (filter && filter !== 'All')
      buildQuery.push(Query.equal('type', filter));

    if (query)
      buildQuery.push(
        Query.or([
          Query.search('name', query),
          Query.search('address', query),
          Query.search('type', query),
        ])
      );

    if (limit) buildQuery.push(Query.limit(limit));

    const result = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!,
      buildQuery
    );

    return result.documents;
  } catch (error) {
    console.error(error);
    return [];
  }
}

// write function to get property by id
export async function getPropertyById({ id }: { id: string }) {
  try {
    const result = await databases.getDocument(
      config.databaseId!,
      config.propertiesCollectionId!,
      id
    );
    return result;
  } catch (error) {
    console.error(error);
    return null;
  }
}
