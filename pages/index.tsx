export const getServerSideProps = async () => {
  return {
    redirect: {
      destination: "/auth/login",
      permanent: false,
    },
  };
};

export default function Home() {
  return null;
}
