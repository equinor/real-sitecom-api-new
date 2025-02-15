import React, { useContext, useEffect, useState } from "react";
import NavigationContext from "../../contexts/navigationContext";
import OperationContext from "../../contexts/operationContext";
import OperationType from "../../contexts/operationType";
import RiskObject from "../../models/riskObject";
import { getContextMenuPosition } from "../ContextMenus/ContextMenu";
import RiskObjectContextMenu, { RiskObjectContextMenuProps } from "../ContextMenus/RiskContextMenu";
import formatDateString from "../DateFormatter";
import { ContentTable, ContentTableColumn, ContentTableRow, ContentType } from "./table";
import { clipLongString } from "./ViewUtils";

export interface RiskObjectRow extends ContentTableRow, RiskObject {
  risk: RiskObject;
}

export const RisksListView = (): React.ReactElement => {
  const { navigationState } = useContext(NavigationContext);
  const {
    operationState: { timeZone }
  } = useContext(OperationContext);
  const { selectedWellbore, selectedServer, servers } = navigationState;
  const { dispatchOperation } = useContext(OperationContext);
  const [risks, setRisks] = useState<RiskObject[]>([]);

  useEffect(() => {
    if (selectedWellbore && selectedWellbore.risks) {
      setRisks(selectedWellbore.risks);
    }
  }, [selectedWellbore]);

  const getTableData = () => {
    return risks.map((risk) => {
      return {
        ...risk,
        ...risk.commonData,
        id: risk.uid,
        mdBitStart: `${risk.mdBitStart?.value?.toFixed(4) ?? ""} ${risk.mdBitStart?.uom ?? ""}`,
        mdBitEnd: `${risk.mdBitEnd?.value?.toFixed(4) ?? ""} ${risk.mdBitEnd?.uom ?? ""}`,
        dTimStart: formatDateString(risk.dTimStart, timeZone),
        dTimEnd: formatDateString(risk.dTimEnd, timeZone),
        dTimCreation: formatDateString(risk.commonData.dTimCreation, timeZone),
        dTimLastChange: formatDateString(risk.commonData.dTimLastChange, timeZone),
        details: clipLongString(risk.details, 30),
        risk: risk
      };
    });
  };

  const columns: ContentTableColumn[] = [
    { property: "dTimCreation", label: "Created", type: ContentType.DateTime },
    { property: "dTimLastChange", label: "Last changed", type: ContentType.DateTime },
    { property: "name", label: "Name", type: ContentType.String },
    { property: "type", label: "Type", type: ContentType.String },
    { property: "category", label: "Category", type: ContentType.String },
    { property: "subCategory", label: "Sub Category", type: ContentType.String },
    { property: "extendCategory", label: "Extend Category", type: ContentType.String },
    { property: "affectedPersonnel", label: "Affected Personnel", type: ContentType.String },
    { property: "dTimStart", label: "Date Time start", type: ContentType.DateTime },
    { property: "dTimEnd", label: "Date Time end", type: ContentType.DateTime },
    { property: "mdBitStart", label: "mdBitStart", type: ContentType.String },
    { property: "mdBitEnd", label: "mdBitEnd", type: ContentType.String },
    { property: "severityLevel", label: "Severity Level", type: ContentType.String },
    { property: "probabilityLevel", label: "Probability Level", type: ContentType.String },
    { property: "summary", label: "Summary", type: ContentType.String },
    { property: "details", label: "Details", type: ContentType.String },
    { property: "itemState", label: "Item State", type: ContentType.String },
    { property: "sourceName", label: "Source Name", type: ContentType.String }
  ];

  const onContextMenu = (event: React.MouseEvent<HTMLLIElement>, {}, checkedRiskObjectRows: RiskObjectRow[]) => {
    const contextProps: RiskObjectContextMenuProps = { checkedRiskObjectRows, dispatchOperation, selectedServer, wellbore: selectedWellbore, servers };
    const position = getContextMenuPosition(event);
    dispatchOperation({ type: OperationType.DisplayContextMenu, payload: { component: <RiskObjectContextMenu {...contextProps} />, position } });
  };

  return Object.is(selectedWellbore?.risks, risks) && <ContentTable columns={columns} data={getTableData()} onContextMenu={onContextMenu} checkableRows />;
};

export default RisksListView;
