import { ScrollView, Text, View } from "react-native";
import { Container } from "@/components/container";

export default function Home() {
  return (
    <Container>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <Text className="mb-4 font-bold font-mono text-3xl text-foreground">
          Yayyyyyyy{" "}
        </Text>
        <View className="mb-6 rounded-xl border border-border bg-card p-6 shadow-sm" />
      </ScrollView>
    </Container>
  );
}
