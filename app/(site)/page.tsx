import Hero from "@/components/home/Hero";
import TrustBar from "@/components/home/TrustBar";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import Categories from "@/components/home/Categories";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import Reviews from "@/components/home/Reviews";
import Newsletter from "@/components/home/Newsletter";

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <FeaturedProducts />
      <Categories />
      <WhyChooseUs />
      <Reviews />
      <Newsletter />
    </>
  );
}
