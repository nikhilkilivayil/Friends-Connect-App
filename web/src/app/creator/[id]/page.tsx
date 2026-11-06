import FriendsConnectApp from '../../page';

export default function CreatorPage({ params }: { params: { id: string } }) {
  return <FriendsConnectApp initialCreatorId={params.id} />;
}
