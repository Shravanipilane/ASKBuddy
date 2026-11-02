import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Features from '../components/Features'
import HowItWorks from '../components/HowItWorks'
import Subjects from '../components/Subjects'
import CallToAction from '../components/CallToAction'
import Footer from '../components/Footer'

// The Home page is just all the sections placed one after another.
export default function Home() {
    return (
        <>
            <Navbar />
            <main>
                <Hero />
                <Features />
                <HowItWorks />
                <Subjects />
                <CallToAction />
            </main>
            <Footer />
        </>
    )
}