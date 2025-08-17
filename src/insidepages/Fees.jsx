import React from "react";
import { Tabs } from "antd";
import FeeComponents from "../components/FeeComponents";
import FeeManage from "../components/FeeManage";

const { TabPane } = Tabs;

export default function Fees() {
  return (
    <div style={{ padding: "24px" }}>
      <Tabs defaultActiveKey="components" type="card">
        <TabPane tab="Components" key="components">
          <FeeComponents />
        </TabPane>
        <TabPane tab="Manage" key="manage">
          <FeeManage />
        </TabPane>
      </Tabs>
    </div>
  );
}
