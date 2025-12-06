"use client";

import React, { useState } from "react";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import TranslatableBlock from "@/components/TranslatableBlock";

interface SliderItem {
    title: string;
    description: string;
}

interface ReusableSliderProps {
    items: SliderItem[];
    heading: string;
    colorDot?: string;
    //slideStyle?: React.CSSProperties;
    slideStyle?: string
}

export default function ReusableSlider({ items, heading, colorDot = "bg-blue-500", slideStyle }: ReusableSliderProps) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [sliderRef, slider] = useKeenSlider<HTMLDivElement>({
        loop: true,
        mode: "snap",
        slides: { perView: 1, spacing: 20 },
        breakpoints: {
            "(min-width: 640px)": {
                slides: { perView: 1, spacing: 20 },
            },
            "(min-width: 1024px)": {
                slides: { perView: 1, spacing: 10 },
            },
        },
        slideChanged(s) {
            setCurrentSlide(s.track.details.rel);
        },
    });

    return (
        <div className="max-w-4xl mx-auto py-8">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2 text-left">
                <div className={`w-2 h-2 rounded-full ${colorDot}`}></div>
                <TranslatableBlock>{heading}</TranslatableBlock>
            </h3>


            <div className="relative">
                {/* Slider */}
                <div ref={sliderRef} className="keen-slider">
                    {items.map((item, idx) => (
                        <div key={idx} className="keen-slider__slide flex justify-center">
                            <div
                                className={`p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between ${slideStyle}`}
                            // style={{
                            //   width: "70%",       // default width
                            //   maxWidth: "500px",
                            //   height: "250px",      // <-- apply custom styles from props
                            // }}
                            >
                                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                                    <TranslatableBlock>{item.title}</TranslatableBlock>
                                </h4>
                                <p className="text-gray-700 dark:text-gray-300"><TranslatableBlock>{item.description}</TranslatableBlock></p>
                            </div>
                        </div>
                    ))}
                </div>


                {/* Arrows */}
                <button
                    onClick={() => slider.current?.prev()}
                    className="absolute top-1/2 left-0 -translate-y-1/2 bg-white dark:bg-gray-800/70 rounded-full p-2 shadow-md hover:bg-gray-100 dark:hover:bg-gray-700/90 transition z-10"
                >
                    <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-white" />
                </button>
                <button
                    onClick={() => slider.current?.next()}
                    className="absolute top-1/2 right-0 -translate-y-1/2 bg-white dark:bg-gray-800/70 rounded-full p-2 shadow-md hover:bg-gray-100 dark:hover:bg-gray-700/90 transition z-10"
                >
                    <ChevronRight className="w-5 h-5 text-gray-700 dark:text-white" />
                </button>
            </div>

            {/* Slide Counter */}
            <div className="text-center mt-4 text-gray-600 dark:text-gray-300 font-medium">
                {currentSlide + 1}/{items.length}
            </div>
        </div>
    );
}


// w-11/12 → almost full width on mobile

// sm:w-3/4 → 75% width on small screens (≥640px)

// md:w-1/2 → 50% width on medium screens (≥768px)

// h-64 → height on mobile

// md:h-72 → larger height on medium+ screens