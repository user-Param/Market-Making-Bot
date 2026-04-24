"use client"
import Chart from "@/components/chart"
import ControlPannel from "@/components/controlpannel"
import Navbar from "@/components/navbar"
import OrderHistory from "@/components/orderhistory"
import PulseMap from "@/components/pulsemap"
import Symbol from "@/components/symbol"

export default function Home() {
  return (
    <>
      <Navbar/>
      <div className="h-screen flex">
          <Symbol/>
          <OrderHistory/>
          <div className="h-full w-full">
            <Chart/>
            <PulseMap/>
            <ControlPannel/>
          </div>
      </div>
    </>
    )}
