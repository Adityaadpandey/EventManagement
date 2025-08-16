import { Container } from "@/components/container";
import { ScrollView, Text, View } from "react-native";

export default function Home() {
  return (
    <Container>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <Text className="font-mono text-foreground text-3xl font-bold mb-4">
          Yayyyyyyy{" "}
        </Text>
        <View className="bg-card border border-border rounded-xl p-6 mb-6 shadow-sm"></View>
      </ScrollView>
    </Container>
  );
}
