import MyProvidersPage, {
  metadata as myProvidersMetadata,
} from "../my-providers/page";

export const metadata = myProvidersMetadata;

export default function ProvidersPage() {
  return MyProvidersPage();
}
